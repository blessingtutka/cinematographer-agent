"""Scenes router.

Implements:
    POST /scenes/analyze
    GET  /scenes/{scene_id}
    POST /scenes/{scene_id}/shot-plan
    GET  /scenes/{scene_id}/shots
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.cinematographer_agent import DroneInfo, plan as cinematographer_plan
from app.agents.exceptions import GeminiError, InternalProcessingError, ShotPlanValidationError
from app.agents.research_agent import research
from app.agents.scene_analyzer import analyze_scene
from app.db.base import get_db
from app.models.scene import SceneModel
from app.models.shot_plan import ShotPlanModel
from cinematography_schema.schema import SceneAnalysis, Shot, ShotPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scenes", tags=["scenes"])


class SceneAnalyzeRequest(BaseModel):
    raw_text: str = Field(min_length=10, max_length=10000)
    style_reference: str | None = None  # e.g. "Denis Villeneuve", "give it a Fincher feel"
    project_id: str | None = None


# TEMPORARY drone inventory stub — DroneManager doesn't exist yet.
def _get_temporary_drone_inventory() -> list[DroneInfo]:
    return [
        DroneInfo(drone_id="drone-001", name="Alpha"),
        DroneInfo(drone_id="drone-002", name="Bravo"),
        DroneInfo(drone_id="drone-003", name="Charlie"),
    ]


async def _fetch_scene_row_or_404(scene_id: str, db: AsyncSession) -> SceneModel:
    result = await db.execute(select(SceneModel).where(SceneModel.scene_id == scene_id))
    scene_row = result.scalar_one_or_none()
    if scene_row is None:
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")
    return scene_row


def _parse_scene_analysis(scene_row: SceneModel) -> SceneAnalysis:
    """Validate a stored analysis_json blob back into a SceneAnalysis.
    Raises HTTPException(500) on corruption"""
    try:
        return SceneAnalysis.model_validate(scene_row.analysis_json)
    except Exception as exc:
        logger.debug(
            "scenes: stored analysis_json failed to validate for scene_id=%s — %s",
            scene_row.scene_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Stored scene analysis for {scene_row.scene_id} is corrupted or incomplete: {exc}",
        ) from exc


@router.post("/analyze", response_model=SceneAnalysis)
async def analyze(request: SceneAnalyzeRequest, db: AsyncSession = Depends(get_db)) -> SceneAnalysis:
    """Run Scene_Analyzer on raw screenplay text and persist the result."""
    try:
        if request.project_id:
            from app.models.project import ProjectModel

            project = (await db.execute(select(ProjectModel).where(ProjectModel.project_id == request.project_id))).scalar_one_or_none()
            if project is None:
                raise HTTPException(status_code=404, detail=f"Project {request.project_id} not found")
        scene_analysis = await analyze_scene(request.raw_text)
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except InternalProcessingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Attach the requested style reference if the schema addition has been
    # applied; degrade silently (no persistence of style) if not.
    if request.style_reference and "style_reference" in SceneAnalysis.model_fields:
        scene_analysis = scene_analysis.model_copy(update={"style_reference": request.style_reference})

    try:
        scene_row = SceneModel(
            scene_id=scene_analysis.scene_id,
            project_id=request.project_id,
            title=scene_analysis.title,
            raw_text=scene_analysis.raw_text,
            analysis_json=scene_analysis.model_dump(mode="json"),
        )
        if hasattr(scene_row, "style_reference"):
            scene_row.style_reference = request.style_reference
        db.add(scene_row)
        await db.commit()

    except Exception as exc:
        await db.rollback()
        logger.debug("analyze: DB write failed for scene_id=%s — %s", scene_analysis.scene_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist scene analysis: {exc}",
        ) from exc

    return scene_analysis


@router.get("/{scene_id}", response_model=SceneAnalysis)
async def get_scene(scene_id: str, db: AsyncSession = Depends(get_db)) -> SceneAnalysis:
    """Fetch a previously analyzed scene. 404 if it doesn't exist."""
    try:
        scene_row = await _fetch_scene_row_or_404(scene_id, db)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read scene {scene_id}: {exc}") from exc
    return _parse_scene_analysis(scene_row)


@router.post("/{scene_id}/shot-plan", response_model=ShotPlan)
async def create_shot_plan(scene_id: str, db: AsyncSession = Depends(get_db)) -> ShotPlan:
    """Run Research_Agent -> Cinematographer_Agent for an already-analyzed
    scene and persist the resulting ShotPlan, overwriting any existing plan
    for this scene_id. 404 if the scene itself doesn't
    exist."""
    scene_row = await _fetch_scene_row_or_404(scene_id, db)
    scene_analysis = _parse_scene_analysis(scene_row)

    research_context = await research(scene_analysis)
    drone_inventory = _get_temporary_drone_inventory()

    try:
        shot_plan = await cinematographer_plan(scene_analysis, research_context, drone_inventory)
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ShotPlanValidationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        result = await db.execute(
            select(ShotPlanModel).where(ShotPlanModel.scene_id == scene_id)
        )
        existing = result.scalar_one_or_none()
        plan_json = shot_plan.model_dump(mode="json")

        if existing is not None:
            # Overwrite in place.
            existing.plan_id = shot_plan.plan_id
            existing.plan_json = plan_json
        else:
            db.add(
                ShotPlanModel(
                    plan_id=shot_plan.plan_id,
                    scene_id=scene_id,
                    plan_json=plan_json,
                )
                )
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.debug("shot-plan: DB write failed for scene_id=%s — %s", scene_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist ShotPlan for scene {scene_id}: {exc}",
        ) from exc

    return shot_plan


@router.get("/{scene_id}/shots", response_model=list[Shot])
async def get_shots(scene_id: str, db: AsyncSession = Depends(get_db)) -> list[Shot]:
    """Return the ordered list of Shots for a scene's persisted ShotPlan.
    404 if no ShotPlan exists; 500 if the persisted plan can't be
    read."""
    try:
        result = await db.execute(select(ShotPlanModel).where(ShotPlanModel.scene_id == scene_id))
        plan_row = result.scalar_one_or_none()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read ShotPlan for scene {scene_id}: {exc}",
        ) from exc
    if plan_row is None:
        raise HTTPException(status_code=404, detail=f"No ShotPlan exists for scene {scene_id}")

    try:
        shot_plan = ShotPlan.model_validate(plan_row.plan_json)
    except Exception as exc:
        logger.debug("get_shots: plan_json failed to validate for scene_id=%s — %s", scene_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Persisted ShotPlan for scene {scene_id} could not be read: {exc}",
        ) from exc

    return sorted(shot_plan.shots, key=lambda shot: shot.sequence)