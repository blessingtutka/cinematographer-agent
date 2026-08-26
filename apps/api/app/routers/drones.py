from fastapi import APIRouter

router = APIRouter(prefix="/drones", tags=["drones"])


@router.get("")
async def list_drones() -> dict:
    return {"status": "not implemented"}


@router.get("/{drone_id}")
async def get_drone(drone_id: str) -> dict:
    return {"status": "not implemented"}
