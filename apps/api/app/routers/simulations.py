from fastapi import APIRouter

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("")
async def create_simulation() -> dict:
    return {"status": "not implemented"}


@router.post("/{simulation_id}/start")
async def start_simulation(simulation_id: str) -> dict:
    return {"status": "not implemented"}


@router.post("/{simulation_id}/pause")
async def pause_simulation(simulation_id: str) -> dict:
    return {"status": "not implemented"}


@router.post("/{simulation_id}/stop")
async def stop_simulation(simulation_id: str) -> dict:
    return {"status": "not implemented"}
