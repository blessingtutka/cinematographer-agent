"""Registry and dispatch orchestration for abstract Drone instances."""

import logging
from uuid import uuid4

from .base import Drone
from cinematography_schema.schema import Shot
from cinematography_schema.schema import Vector3

logger = logging.getLogger(__name__)


class DroneManager:
    def __init__(self) -> None:
        self._drones: dict[str, Drone] = {}

    def register(self, drone: Drone) -> None:
        self._drones[drone.drone_id] = drone

    def create_virtual(self, name: str, bluetooth_device_id: str | None = None) -> Drone:
        drone = __import__("app.drone.virtual_drone", fromlist=["VirtualDrone"]).VirtualDrone(
            drone_id=f"drone-{uuid4().hex[:8]}",
            name=name,
            home_position=Vector3(x=0, y=1.8, z=0),
            bluetooth_device_id=bluetooth_device_id,
        )
        self.register(drone)
        return drone

    def remove(self, drone_id: str) -> bool:
        return self._drones.pop(drone_id, None) is not None

    def set_connection(self, drone_id: str, online: bool, bluetooth_device_id: str | None = None) -> Drone | None:
        drone = self.get_by_id(drone_id)
        if drone is None:
            return None
        setattr(drone, "online", online)
        if bluetooth_device_id is not None:
            setattr(drone, "bluetooth_device_id", bluetooth_device_id)
        return drone

    def simulation_manager(self, drone_ids: list[str]) -> "DroneManager":
        from .virtual_drone import VirtualDrone

        simulation = DroneManager()
        for drone_id in drone_ids:
            source = self.get_by_id(drone_id)
            if source is None:
                continue
            simulation.register(
                VirtualDrone(
                    drone_id=source.drone_id,
                    name=source.name,
                    home_position=getattr(source, "home_position", Vector3(x=0, y=1.8, z=0)),
                    online=True,
                    bluetooth_device_id=getattr(source, "bluetooth_device_id", None),
                )
            )
        return simulation

    def dispatch_shot(self, shot: Shot) -> None:
        drone = self.get_by_name(shot.drone_name)
        if drone is None:
            logger.error("No registered drone named %s; skipping shot %s", shot.drone_name, shot.shot_id)
            return
        drone.receive_shot(shot)

    def get_all(self) -> list[Drone]:
        return list(self._drones.values())

    def get_by_id(self, drone_id: str) -> Drone | None:
        return self._drones.get(drone_id)

    def get_by_name(self, name: str) -> Drone | None:
        return next((drone for drone in self._drones.values() if drone.name == name), None)

    def return_all_home(self) -> None:
        for drone in self._drones.values():
            return_home = getattr(drone, "return_home", None)
            if return_home is not None:
                return_home()