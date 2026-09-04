from fastapi import APIRouter, Depends, HTTPException, Request

from app.drone.manager import DroneManager
from app.core.deps import get_current_user

router = APIRouter(
    prefix="/drones",
    tags=["drones"],
    dependencies=[Depends(get_current_user)],
)


def get_drone_manager(request: Request) -> DroneManager:
    return request.app.state.drone_manager


@router.get("")
async def list_drones(manager: DroneManager = Depends(get_drone_manager)) -> list[dict]:
    return [
        drone.get_status().model_dump(mode="json", exclude_none=True)
        for drone in manager.get_all()
    ]


@router.get("/{drone_id}")
async def get_drone(
    drone_id: str,
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    drone = manager.get_by_id(drone_id)
    if drone is None:
        raise HTTPException(status_code=404, detail=f"Drone {drone_id} not found")
    return drone.get_status().model_dump(mode="json", exclude_none=True)
