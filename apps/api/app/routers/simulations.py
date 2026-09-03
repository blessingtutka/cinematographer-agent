from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.scene import SceneModel
from app.models.shot_plan import ShotPlanModel
from app.models.simulation import SimulationModel
from app.simulation.engine import SimulationEngine
from app.simulation.websocket import WebSocketManager
from cinematography_schema.schema import SceneAnalysis, ShotPlan, SimulationState

router = APIRouter(prefix="/simulations", tags=["simulations"])


class CreateSimulationRequest(BaseModel):
    scene_id: str


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _response(row: SimulationModel) -> dict:
    return {
        "simulation_id": row.simulation_id,
        "scene_id": row.scene_id,
        "state": row.state,
        "created_at": row.created_at.isoformat() if hasattr(row.created_at, "isoformat") else row.created_at,
        "updated_at": row.updated_at.isoformat() if hasattr(row.updated_at, "isoformat") else row.updated_at,
    }


def _runtime(request: Request) -> tuple[dict, WebSocketManager]:
    return request.app.state.simulation_engines, request.app.state.websocket_manager


def can_transition(current: SimulationState, target: SimulationState) -> bool:
    return (current, target) in {
        (SimulationState.CREATED, SimulationState.RUNNING),
        (SimulationState.PAUSED, SimulationState.RUNNING),
        (SimulationState.RUNNING, SimulationState.PAUSED),
        (SimulationState.RUNNING, SimulationState.COMPLETED),
        (SimulationState.PAUSED, SimulationState.COMPLETED),
    }


@router.post("")
async def create_simulation(request: CreateSimulationRequest, http_request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    scene = (await db.execute(select(SceneModel).where(SceneModel.scene_id == request.scene_id))).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene {request.scene_id} not found")
    plan_row = (await db.execute(select(ShotPlanModel).where(ShotPlanModel.scene_id == request.scene_id))).scalar_one_or_none()
    if plan_row is None:
        raise HTTPException(status_code=422, detail=f"No ShotPlan exists for scene {request.scene_id}")
    try:
        shot_plan = ShotPlan.model_validate(plan_row.plan_json)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stored ShotPlan could not be read: {exc}") from exc

    # Load scene analysis so the Vision_Agent has scene context during the sim
    scene_analysis: SceneAnalysis | None = None
    try:
        scene_analysis = SceneAnalysis.model_validate(scene.analysis_json)
    except Exception:
        pass  # Vision degrades gracefully if analysis is missing

    simulation_id = str(uuid4())
    row = SimulationModel(simulation_id=simulation_id, scene_id=request.scene_id, state=SimulationState.CREATED.value)
    db.add(row)
    await db.flush()
    engines, websocket_manager = _runtime(http_request)
    engines[simulation_id] = SimulationEngine(
        simulation_id,
        shot_plan,
        http_request.app.state.drone_manager,
        websocket_manager,
        scene_analysis=scene_analysis,
    )
    return _response(row)


@router.post("/{simulation_id}/start")
async def start_simulation(simulation_id: str, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    row = await _get_simulation(simulation_id, db)
    if not can_transition(SimulationState(row.state), SimulationState.RUNNING):
        raise HTTPException(status_code=409, detail=f"Simulation cannot start from {row.state} state")
    engines, websocket_manager = _runtime(request)
    engine = engines.get(simulation_id)
    if engine is None:
        raise HTTPException(status_code=500, detail="Simulation runtime is unavailable")
    row.state = SimulationState.RUNNING.value
    engine.state = SimulationState.RUNNING
    await engine.start()
    await websocket_manager.broadcast(simulation_id, engine._state_event())
    return _response(row)


@router.post("/{simulation_id}/pause")
async def pause_simulation(simulation_id: str, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    row = await _get_simulation(simulation_id, db)
    if not can_transition(SimulationState(row.state), SimulationState.PAUSED):
        raise HTTPException(status_code=409, detail=f"Simulation cannot pause from {row.state} state")
    row.state = SimulationState.PAUSED.value
    engine = _runtime(request)[0].get(simulation_id)
    await engine.pause()
    return _response(row)


@router.post("/{simulation_id}/stop")
async def stop_simulation(simulation_id: str, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    row = await _get_simulation(simulation_id, db)
    if not can_transition(SimulationState(row.state), SimulationState.COMPLETED):
        raise HTTPException(status_code=409, detail=f"Simulation cannot stop from {row.state} state")
    row.state = SimulationState.COMPLETED.value
    await _runtime(request)[0][simulation_id].stop()
    return _response(row)


async def _get_simulation(simulation_id: str, db: AsyncSession) -> SimulationModel:
    row = (await db.execute(select(SimulationModel).where(SimulationModel.simulation_id == simulation_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    return row


