"""Registry and dispatch orchestration for abstract Drone instances."""

import logging

from .base import Drone
from cinematography_schema.schema import Shot

logger = logging.getLogger(__name__)


class DroneManager:
    def __init__(self) -> None:
        self._drones: dict[str, Drone] = {}

    def register(self, drone: Drone) -> None:
        self._drones[drone.drone_id] = drone

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