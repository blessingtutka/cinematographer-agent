from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.base import get_db
from app.drone.manager import DroneManager
from app.drone.virtual_drone import VirtualDrone
from app.models.drone import DroneModel
from app.models.user import UserModel
from cinematography_schema.schema import Vector3

router = APIRouter(
    prefix="/drones",
    tags=["drones"],
    dependencies=[Depends(get_current_user)],
)


class DroneCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    bluetooth_device_id: str | None = Field(default=None, max_length=200)


class DroneUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    bluetooth_device_id: str | None = Field(default=None, max_length=200)


class DroneConnectionRequest(BaseModel):
    bluetooth_device_id: str | None = Field(default=None, max_length=200)


def get_drone_manager(request: Request) -> DroneManager:
    return request.app.state.drone_manager


def _runtime(row: DroneModel, manager: DroneManager) -> VirtualDrone:
    runtime = VirtualDrone(
        drone_id=row.drone_id,
        name=row.name,
        home_position=Vector3(x=0, y=1.8, z=0),
        online=row.online,
        bluetooth_device_id=row.bluetooth_device_id,
    )
    manager.register(runtime)
    return runtime


def _status(row: DroneModel, manager: DroneManager) -> dict:
    return _runtime(row, manager).get_status().model_dump(mode="json", exclude_none=True)


async def _owned_drone(drone_id: str, user: UserModel, db: AsyncSession) -> DroneModel:
    row = (
        await db.execute(
            select(DroneModel).where(
                DroneModel.drone_id == drone_id,
                DroneModel.owner_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Drone {drone_id} not found")
    return row


@router.get("")
async def list_drones(
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> list[dict]:
    rows = (
        await db.execute(
            select(DroneModel)
            .where(DroneModel.owner_id == user.id)
            .order_by(DroneModel.created_at)
        )
    ).scalars()
    return [_status(row, manager) for row in rows]


@router.post("")
async def create_drone(
    payload: DroneCreateRequest,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    count = await db.scalar(
        select(func.count()).select_from(DroneModel).where(DroneModel.owner_id == user.id)
    )
    if count is not None and count >= 10:
        raise HTTPException(status_code=409, detail="Each director can register up to 10 drones")
    row = DroneModel(
        drone_id=f"drone-{uuid4().hex[:12]}",
        owner_id=user.id,
        name=payload.name,
        bluetooth_device_id=payload.bluetooth_device_id,
    )
    db.add(row)
    await db.flush()
    return _status(row, manager)


@router.get("/{drone_id}")
async def get_drone(
    drone_id: str,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    return _status(await _owned_drone(drone_id, user, db), manager)


@router.patch("/{drone_id}")
async def update_drone(
    drone_id: str,
    payload: DroneUpdateRequest,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    row = await _owned_drone(drone_id, user, db)
    if payload.name is not None:
        row.name = payload.name
    if payload.bluetooth_device_id is not None:
        row.bluetooth_device_id = payload.bluetooth_device_id
    await db.flush()
    return _status(row, manager)


@router.delete("/{drone_id}", status_code=204)
async def delete_drone(
    drone_id: str,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> None:
    row = await _owned_drone(drone_id, user, db)
    await db.delete(row)
    manager.remove(drone_id)


@router.post("/{drone_id}/connect")
async def connect_drone(
    drone_id: str,
    payload: DroneConnectionRequest,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    row = await _owned_drone(drone_id, user, db)
    row.online = True
    if payload.bluetooth_device_id is not None:
        row.bluetooth_device_id = payload.bluetooth_device_id
    await db.flush()
    return _status(row, manager)


@router.post("/{drone_id}/disconnect")
async def disconnect_drone(
    drone_id: str,
    user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    manager: DroneManager = Depends(get_drone_manager),
) -> dict:
    row = await _owned_drone(drone_id, user, db)
    row.online = False
    await db.flush()
    return _status(row, manager)
