from hypothesis import given, settings, strategies as st

from app.drone.base import Drone
from app.drone.manager import DroneManager
from app.drone.virtual_drone import VirtualDrone
from cinematography_schema.schema import CameraFeed, CameraMovement, DroneStatus, Shot, Vector3


class RecordingDrone(Drone):
    def __init__(self, drone_id: str, name: str) -> None:
        self.drone_id = drone_id
        self.name = name
        self.received: list[Shot] = []

    def receive_shot(self, shot: Shot) -> None:
        self.received.append(shot)

    def move_to(self, trajectory) -> None:
        pass

    def get_status(self) -> DroneStatus:
        raise NotImplementedError

    def get_camera_feed(self) -> CameraFeed:
        raise NotImplementedError


@settings(max_examples=100)
@given(shot=st.from_type(Shot))
def test_dispatches_only_to_drone_matching_shot_name(shot: Shot) -> None:
    shot = shot.model_copy(update={"drone_name": "Bravo"})
    manager = DroneManager()
    alpha = RecordingDrone("drone-001", "Alpha")
    bravo = RecordingDrone("drone-002", "Bravo")
    charlie = RecordingDrone("drone-003", "Charlie")
    for drone in (alpha, bravo, charlie):
        manager.register(drone)

    manager.dispatch_shot(shot)

    assert alpha.received == []
    assert bravo.received == [shot]
    assert charlie.received == []


def test_virtual_drone_moves_along_dispatched_shot_trajectory() -> None:
    shot = Shot(
        shot_id="shot-1",
        sequence=1,
        shot_type="WIDE",
        camera_movement=CameraMovement.MOVE_TO,
        drone_name="Alpha",
        subject="The stage",
        duration_seconds=2.0,
        rationale="Reveal the full stage before the action begins.",
    )
    drone = VirtualDrone("drone-001", "Alpha", Vector3(x=0, y=1.8, z=0))

    drone.receive_shot(shot)
    start = drone.get_status().position
    drone.advance(1.0)
    middle = drone.get_status().position
    drone.advance(1.0)
    end = drone.get_status().position

    assert middle != start
    assert end != middle
    assert drone.get_status().active_shot is None