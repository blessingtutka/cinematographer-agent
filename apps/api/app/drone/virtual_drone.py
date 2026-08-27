"""In-memory drone implementation used by the simulation."""

from cinematography_schema.schema import CameraFeed, DroneStatus, Shot, Trajectory, Vector3

from .base import Drone


class VirtualDrone(Drone):
    def __init__(self, drone_id: str, name: str, home_position: Vector3 | None = None) -> None:
        self.drone_id = drone_id
        self.name = name
        self.home_position = home_position or Vector3(x=0, y=0, z=0)
        self.current_position = self.home_position.model_copy()
        self.current_orientation = {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0}
        self.active_shot: Shot | None = None
        self.is_recording = False
        self.trajectory: Trajectory | None = None
        self.trajectory_progress = 0.0

    def receive_shot(self, shot: Shot) -> None:
        self.active_shot = shot
        self.is_recording = True
        self.trajectory_progress = 0.0

    def move_to(self, trajectory: Trajectory) -> None:
        self.trajectory = trajectory
        self.trajectory_progress = 0.0
        self.current_position = trajectory.points[0].model_copy()

    def get_status(self) -> DroneStatus:
        return DroneStatus(
            drone_id=self.drone_id,
            name=self.name,
            position=self.current_position.model_copy(),
            orientation=dict(self.current_orientation),
            is_recording=self.is_recording,
            active_shot=self.active_shot,
        )

    def get_camera_feed(self) -> CameraFeed:
        return CameraFeed(
            drone_id=self.drone_id,
            drone_name=self.name,
            position=self.current_position.model_copy(),
            orientation=dict(self.current_orientation),
            fov_degrees=60.0,
            is_recording=self.is_recording,
        )

    def return_home(self) -> None:
        self.current_position = self.home_position.model_copy()
        self.trajectory = None
        self.trajectory_progress = 0.0
        self.active_shot = None
        self.is_recording = False