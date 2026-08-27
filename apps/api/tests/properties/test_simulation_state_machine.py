import pytest
from hypothesis import given, settings, strategies as st

from app.routers.simulations import can_transition
from cinematography_schema.schema import SimulationState


@settings(max_examples=100)
@given(
    current=st.sampled_from(list(SimulationState)),
    target=st.sampled_from(list(SimulationState)),
)
def test_only_lifecycle_transitions_are_allowed(current: SimulationState, target: SimulationState) -> None:
    expected = (current, target) in {
        (SimulationState.CREATED, SimulationState.RUNNING),
        (SimulationState.PAUSED, SimulationState.RUNNING),
        (SimulationState.RUNNING, SimulationState.PAUSED),
        (SimulationState.RUNNING, SimulationState.COMPLETED),
        (SimulationState.PAUSED, SimulationState.COMPLETED),
    }
    assert can_transition(current, target) is expected


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (SimulationState.CREATED, SimulationState.PAUSED),
        (SimulationState.CREATED, SimulationState.COMPLETED),
        (SimulationState.COMPLETED, SimulationState.RUNNING),
        (SimulationState.COMPLETED, SimulationState.PAUSED),
    ],
)
def test_invalid_transitions_are_rejected(current: SimulationState, target: SimulationState) -> None:
    assert can_transition(current, target) is False