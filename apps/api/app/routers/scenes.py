"""Scenes router.

Implements:
    POST /scenes/analyze
    GET  /scenes
    GET  /scenes/{scene_id}
    PATCH /scenes/{scene_id}
    DELETE /scenes/{scene_id}
    POST /scenes/{scene_id}/reanalyze
    POST /scenes/{scene_id}/shot-plan
    GET  /scenes/{scene_id}/shots
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.cinematographer_agent import DroneInfo, plan as cinematographer_plan
from app.agents.exceptions import GeminiError, InternalProcessingError, ShotPlanValidationError
from app.agents.research_agent import research
from app.agents.scene_analyzer import analyze_scene
from app.core.deps import get_current_user
from app.db.base import get_db
from app.models.scene import SceneModel
from app.models.shot_plan import ShotPlanModel
from app.models.drone import DroneModel
from app.models.user import UserModel
from app.models.project import ProjectModel
from cinematography_schema.schema import SceneAnalysis, Shot, ShotPlan

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scenes",
    tags=["scenes"],
    dependencies=[Depends(get_current_user)],
)


class SceneAnalyzeRequest(BaseModel):
    raw_text: str = Field(min_length=10, max_length=10000)
    style_reference: str | None = None  # e.g. "Denis Villeneuve", "give it a Fincher feel"
    project_id: str | None = None


class SceneUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    raw_text: str = Field(min_length=10, max_length=10000)


class SceneReanalyzeRequest(BaseModel):
    raw_text: str = Field(min_length=10, max_length=10000)
    style_reference: str | None = None


class ShotPlanRequest(BaseModel):
    drone_ids: list[str] = Field(default_factory=list, max_length=3)


async def _fetch_scene_row_or_404(
    scene_id: str, db: AsyncSession, user: UserModel | None = None
) -> SceneModel:
    result = await db.execute(select(SceneModel).where(SceneModel.scene_id == scene_id))
    scene_row = result.scalar_one_or_none()
    if scene_row is None:
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")
    if user is not None and scene_row.project_id is not None:
        project = await db.get(ProjectModel, scene_row.project_id)
        if project is None or project.owner_id != user.id:
            raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")
    return scene_row


def _store_analysis(scene_row: SceneModel, analysis: SceneAnalysis) -> None:
    scene_row.title = analysis.title
    scene_row.description = analysis.description
    scene_row.raw_text = analysis.raw_text
    scene_row.style_reference = analysis.style_reference
    scene_row.analysis_json = analysis.model_dump(mode="json")


@router.get("", response_model=list[SceneAnalysis])
async def list_scenes(
    db: AsyncSession = Depends(get_db), user: UserModel = Depends(get_current_user)
) -> list[SceneAnalysis]:
    """List all analyzed scenes belonging to the current user."""
    result = await db.execute(
        select(SceneModel)
        .join(ProjectModel, SceneModel.project_id == ProjectModel.project_id)
        .where(ProjectModel.owner_id == user.id)
        .order_by(SceneModel.updated_at.desc())
    )
    return [_parse_scene_analysis(scene) for scene in result.scalars().all()]


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
            description=scene_analysis.description,
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


@router.patch("/{scene_id}", response_model=SceneAnalysis)
async def update_scene(
    scene_id: str,
    payload: SceneUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> SceneAnalysis:
    """Update the editable scene brief while preserving its analysis."""
    scene_row = await _fetch_scene_row_or_404(scene_id, db, user)
    scene_row.title = payload.title
    scene_row.description = payload.description
    scene_row.raw_text = payload.raw_text
    analysis = _parse_scene_analysis(scene_row).model_copy(
        update={"title": payload.title, "description": payload.description, "raw_text": payload.raw_text}
    )
    scene_row.analysis_json = analysis.model_dump(mode="json")
    await db.commit()
    return analysis


@router.delete("/{scene_id}", status_code=204)
async def delete_scene(
    scene_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> None:
    """Delete a scene and its cascaded shot plan."""
    scene_row = await _fetch_scene_row_or_404(scene_id, db, user)
    await db.delete(scene_row)
    await db.commit()


@router.post("/{scene_id}/reanalyze", response_model=SceneAnalysis)
async def reanalyze_scene(
    scene_id: str,
    payload: SceneReanalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> SceneAnalysis:
    """Run the complete Gemini scene-analysis process again in place."""
    scene_row = await _fetch_scene_row_or_404(scene_id, db, user)
    try:
        analysis = await analyze_scene(payload.raw_text)
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except InternalProcessingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    analysis = analysis.model_copy(
        update={
            "scene_id": str(scene_row.scene_id),
            "style_reference": payload.style_reference
            if payload.style_reference is not None
            else scene_row.style_reference,
        }
    )
    _store_analysis(scene_row, analysis)
    shot_plan = await db.scalar(
        select(ShotPlanModel).where(ShotPlanModel.scene_id == scene_row.scene_id)
    )
    if shot_plan is not None:
        await db.delete(shot_plan)
    await db.commit()
    return analysis


@router.get("/{scene_id}", response_model=SceneAnalysis)
async def get_scene(
    scene_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> SceneAnalysis:
    """Fetch a previously analyzed scene. 404 if it doesn't exist."""
    try:
        scene_row = await _fetch_scene_row_or_404(scene_id, db, user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read scene {scene_id}: {exc}") from exc
    return _parse_scene_analysis(scene_row)


@router.post("/{scene_id}/shot-plan", response_model=ShotPlan)
async def create_shot_plan(
    scene_id: str,
    request: Request,
    payload: ShotPlanRequest | None = None,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShotPlan:
    """Run Research_Agent -> Cinematographer_Agent for an already-analyzed
    scene and persist the resulting ShotPlan, overwriting any existing plan
    for this scene_id. 404 if the scene itself doesn't
    exist."""
    scene_row = await _fetch_scene_row_or_404(scene_id, db, user)
    scene_analysis = _parse_scene_analysis(scene_row)

    research_context = await research(scene_analysis)
    selected = payload.drone_ids if payload is not None else []
    selected_rows = (
        await db.execute(
            select(DroneModel).where(
                DroneModel.owner_id == user.id,
                DroneModel.drone_id.in_(selected),
            )
        )
    ).scalars().all()
    if not selected:
        selected_rows = (
            await db.execute(
                select(DroneModel)
                .where(DroneModel.owner_id == user.id)
                .order_by(DroneModel.created_at)
                .limit(3)
            )
        ).scalars().all()
        selected = [drone.drone_id for drone in selected_rows]
    if len(selected) > 3:
        raise HTTPException(status_code=422, detail="A scene can use at most three drones")
    if len(selected_rows) != len(selected):
        raise HTTPException(status_code=422, detail="Every selected drone must be registered")
    drone_inventory = [
        DroneInfo(drone_id=drone.drone_id, name=drone.name) for drone in selected_rows
    ]
    if not drone_inventory:
        raise HTTPException(status_code=409, detail="Register at least one drone before creating a shot plan")

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


@router.get("/{scene_id}/shot-plan", response_model=ShotPlan)
async def get_shot_plan(
    scene_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> ShotPlan:
    """Return the persisted shot plan for a scene."""
    await _fetch_scene_row_or_404(scene_id, db, user)
    result = await db.execute(select(ShotPlanModel).where(ShotPlanModel.scene_id == scene_id))
    plan_row = result.scalar_one_or_none()
    if plan_row is None:
        raise HTTPException(status_code=404, detail=f"No ShotPlan exists for scene {scene_id}")
    try:
        return ShotPlan.model_validate(plan_row.plan_json)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Persisted ShotPlan for scene {scene_id} could not be read: {exc}") from exc


@router.get("/{scene_id}/shots", response_model=list[Shot])
async def get_shots(
    scene_id: str,
    db: AsyncSession = Depends(get_db),
    user: UserModel = Depends(get_current_user),
) -> list[Shot]:
    """Return the ordered list of Shots for a scene's persisted ShotPlan.
    404 if no ShotPlan exists; 500 if the persisted plan can't be
    read."""
    try:
        await _fetch_scene_row_or_404(scene_id, db, user)
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