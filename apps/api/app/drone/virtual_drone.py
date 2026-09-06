"""In-memory drone implementation used by the simulation."""

from cinematography_schema.schema import (
    CameraFeed,
    CameraMovement,
    DroneStatus,
    Shot,
    Trajectory,
    Vector3,
    VisionAnalysis,
)

from .base import Drone


class VirtualDrone(Drone):
    def __init__(
        self,
        drone_id: str,
        name: str,
        home_position: Vector3 | None = None,
        online: bool = False,
        bluetooth_device_id: str | None = None,
    ) -> None:
        self.drone_id = drone_id
        self.name = name
        self.online = online
        self.bluetooth_device_id = bluetooth_device_id
        self.home_position = home_position or Vector3(x=0, y=0, z=0)
        self.current_position = self.home_position.model_copy()
        self.current_orientation = {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0}
        self.active_shot: Shot | None = None
        self.is_recording = False
        self.trajectory: Trajectory | None = None
        self.trajectory_progress = 0.0
        # Vision state — updated asynchronously by the SimulationEngine tick loop
        self.latest_vision: VisionAnalysis | None = None
        # Tick counter used by the engine to throttle vision calls per drone
        self._vision_tick_counter: int = 0

    def receive_shot(self, shot: Shot) -> None:
        self.active_shot = shot
        self.is_recording = True
        self.trajectory_progress = 0.0
        self.move_to(self._trajectory_for(shot))

    def _trajectory_for(self, shot: Shot) -> Trajectory:
        """Create a visible, deterministic path for the requested camera move."""
        start = self.current_position.model_copy()
        movement_offsets = {
            CameraMovement.DOLLY_IN: (0.0, 0.15, -2.4),
            CameraMovement.DOLLY_OUT: (0.0, 0.4, 2.4),
            CameraMovement.MOVE_TO: (2.2, 0.7, -2.0),
            CameraMovement.TRACK: (2.6, 0.25, -1.2),
            CameraMovement.FOLLOW: (1.8, 0.8, -1.8),
            CameraMovement.ORBIT: (2.2, 0.5, -2.2),
            CameraMovement.PAN: (0.8, 0.15, -0.8),
            CameraMovement.TILT: (-0.8, 0.4, -0.8),
            CameraMovement.STATIC: (0.0, 0.0, 0.0),
        }
        dx, dy, dz = movement_offsets[shot.camera_movement]
        end = Vector3(
            x=start.x + dx,
            y=max(1.2, start.y + dy),
            z=start.z + dz,
        )
        midpoint = Vector3(
            x=start.x + dx * 0.45,
            y=max(1.2, start.y + max(dy * 0.45, 0.25)),
            z=start.z + dz * 0.45,
        )
        return Trajectory(points=[start, midpoint, end], duration_seconds=shot.duration_seconds)

    def move_to(self, trajectory: Trajectory) -> None:
        self.trajectory = trajectory
        self.trajectory_progress = 0.0
        self.current_position = trajectory.points[0].model_copy()

    def set_vision(self, vision: VisionAnalysis) -> None:
        """Store the latest vision analysis produced by the Vision_Agent."""
        self.latest_vision = vision

    def get_status(self) -> DroneStatus:
        return DroneStatus(
            drone_id=self.drone_id,
            name=self.name,
            position=self.current_position.model_copy(),
            orientation=dict(self.current_orientation),
            is_recording=self.is_recording,
            online=self.online,
            connection_type="bluetooth",
            bluetooth_device_id=self.bluetooth_device_id,
            active_shot=self.active_shot,
            vision=self.latest_vision,
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
        self.latest_vision = None
        self._vision_tick_counter = 0

    def advance(self, elapsed_seconds: float) -> bool:
        """Advance the active trajectory and report whether the shot finished."""
        if self.active_shot is None:
            return False
        self.trajectory_progress = min(
            1.0,
            self.trajectory_progress + elapsed_seconds / self.active_shot.duration_seconds,
        )
        if self.trajectory and len(self.trajectory.points) > 1:
            scaled = self.trajectory_progress * (len(self.trajectory.points) - 1)
            segment = min(int(scaled), len(self.trajectory.points) - 2)
            progress = scaled - segment
            start = self.trajectory.points[segment]
            end = self.trajectory.points[segment + 1]
            self.current_position = Vector3(
                x=start.x + (end.x - start.x) * progress,
                y=start.y + (end.y - start.y) * progress,
                z=start.z + (end.z - start.z) * progress,
            )
        if self.trajectory_progress >= 1.0:
            self.active_shot = None
            self.is_recording = False
            return True
        return False
