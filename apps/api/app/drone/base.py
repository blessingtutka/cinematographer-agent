"""Abstract interface for camera-carrying drones."""

from abc import ABC, abstractmethod

from cinematography_schema.schema import CameraFeed, DroneStatus, Shot, Trajectory


class Drone(ABC):
    """Hardware-independent contract consumed by DroneManager."""

    drone_id: str
    name: str

    @abstractmethod
    def receive_shot(self, shot: Shot) -> None:
        ...

    @abstractmethod
    def move_to(self, trajectory: Trajectory) -> None:
        ...

    @abstractmethod
    def get_status(self) -> DroneStatus:
        ...

    @abstractmethod
    def get_camera_feed(self) -> CameraFeed:
        ...