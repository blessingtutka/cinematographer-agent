"""In-memory drone implementation used by the simulation."""

import math

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

STAGE_X_LIMIT = 8.0
STAGE_Z_MIN = -5.0
STAGE_Z_MAX = 5.0


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


class VirtualDrone(Drone):
    def __init__(
        self,
        drone_id: str,
        name: str,
        home_position: Vector3 | None = None,
    ) -> None:
        self.drone_id = drone_id
        self.name = name
        self.home_position = home_position or Vector3(x=0, y=0, z=0)
        self.current_position = self.home_position.model_copy()
        self.current_orientation = {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0}
        self.subject_position: Vector3 | None = None
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

    def set_subject_position(self, position: Vector3) -> None:
        self.subject_position = position.model_copy()

    def _trajectory_for(self, shot: Shot) -> Trajectory:
        """Create a visible, deterministic path for the requested camera move."""
        start = self.current_position.model_copy()
        subject = self.subject_position
        if subject is None:
            subject = Vector3(x=start.x, y=0.95, z=start.z - 3.0)

        to_subject_x = subject.x - start.x
        to_subject_z = subject.z - start.z
        distance = math.hypot(to_subject_x, to_subject_z)
        if distance < 0.1:
            to_subject_x, to_subject_z, distance = 0.0, -1.0, 1.0

        framing_distance = {
            "WIDE": 3.8,
            "MEDIUM": 2.6,
            "CLOSE_UP": 1.7,
            "EXTREME_CLOSE_UP": 1.15,
            "OVER_SHOULDER": 2.2,
            "LOW_ANGLE": 2.8,
            "HIGH_ANGLE": 2.8,
        }.get(shot.shot_type.value, 2.6)
        direction_x = to_subject_x / distance
        direction_z = to_subject_z / distance
        lateral = {CameraMovement.ORBIT: 0.8, CameraMovement.TRACK: 0.45}.get(
            shot.camera_movement, 0.0
        )
        end = Vector3(
            x=_clamp(subject.x - direction_x * framing_distance - direction_z * lateral, -STAGE_X_LIMIT, STAGE_X_LIMIT),
            y=max(1.2, subject.y + (0.65 if shot.shot_type.value == "HIGH_ANGLE" else 0.2)),
            z=_clamp(subject.z - direction_z * framing_distance + direction_x * lateral, STAGE_Z_MIN, STAGE_Z_MAX),
        )
        midpoint = Vector3(
            x=start.x + (end.x - start.x) * 0.45,
            y=max(1.2, start.y + (end.y - start.y) * 0.45),
            z=start.z + (end.z - start.z) * 0.45,
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
