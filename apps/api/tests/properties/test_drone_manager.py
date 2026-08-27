from hypothesis import given, settings, strategies as st

from app.drone.base import Drone
from app.drone.manager import DroneManager
from cinematography_schema.schema import CameraFeed, DroneStatus, Shot


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