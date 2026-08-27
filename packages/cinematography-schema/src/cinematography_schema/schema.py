"""
Pydantic v2 models for the Cinematographer Agent platform.

These schemas are the single source of truth for validation and serialization
across the AI agent pipeline, drone management, and simulation engine.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ShotType(str, Enum):
    """Camera framing types for cinematographic shots."""

    WIDE = "WIDE"
    MEDIUM = "MEDIUM"
    CLOSE_UP = "CLOSE_UP"
    EXTREME_CLOSE_UP = "EXTREME_CLOSE_UP"
    OVER_SHOULDER = "OVER_SHOULDER"
    LOW_ANGLE = "LOW_ANGLE"
    HIGH_ANGLE = "HIGH_ANGLE"


class CameraMovement(str, Enum):
    """Camera movement types for drone choreography."""

    STATIC = "STATIC"
    MOVE_TO = "MOVE_TO"
    DOLLY_IN = "DOLLY_IN"
    DOLLY_OUT = "DOLLY_OUT"
    TRACK = "TRACK"
    FOLLOW = "FOLLOW"
    ORBIT = "ORBIT"
    PAN = "PAN"
    TILT = "TILT"


class EmotionalTone(str, Enum):
    """Emotional tone classifications for scene analysis."""

    NEUTRAL = "NEUTRAL"
    TENSE = "TENSE"
    ROMANTIC = "ROMANTIC"
    MELANCHOLIC = "MELANCHOLIC"
    JOYFUL = "JOYFUL"
    FEARFUL = "FEARFUL"
    ANGRY = "ANGRY"


class Vector3(BaseModel):
    """3D position or direction vector."""

    x: float
    y: float
    z: float


class Trajectory(BaseModel):
    """A drone movement path expressed as ordered world-space points."""

    points: list[Vector3] = Field(min_length=1)
    duration_seconds: float = Field(gt=0)


class CameraFeed(BaseModel):
    """First-person camera state exposed by a drone."""

    drone_id: str
    drone_name: str
    position: Vector3
    orientation: dict
    fov_degrees: float = Field(gt=0)
    is_recording: bool


class Character(BaseModel):
    """A character identified in a screenplay scene."""

    character_id: str
    display_name: str
    initial_position: Vector3


class Action(BaseModel):
    """A physical action performed by a character in the scene."""

    action_id: str
    character_id: str
    description: str
    timestamp_offset: float


class CinematicBeat(BaseModel):
    """A significant narrative or emotional moment in the scene."""

    beat_id: str
    description: str
    timestamp_offset: float
    significance_score: int = Field(ge=1, le=10)


class DialogueLine(BaseModel):
    """A line of dialogue spoken by a character."""

    line_id: str
    character_id: str
    text: str
    narrative_position: float


class SceneAnalysis(BaseModel):
    """Structured analysis of a screenplay scene produced by Scene_Analyzer."""

    scene_id: str
    title: str
    raw_text: str
    characters: list[Character]
    actions: list[Action]
    emotions: list[EmotionalTone]
    cinematic_beats: list[CinematicBeat]
    dialogue: list[DialogueLine]


class Shot(BaseModel):
    """A single camera shot assigned to a named drone."""

    shot_id: str
    sequence: int
    shot_type: ShotType
    camera_movement: CameraMovement
    drone_name: str
    subject: str
    duration_seconds: float = Field(gt=0)
    rationale: str = Field(min_length=1, max_length=500)
    cinematic_beat_id: Optional[str] = None


class ResearchSource(BaseModel):
    """A search query result used to inform cinematography decisions."""

    query: str
    reference_count: int


class ShotPlan(BaseModel):
    """
    The complete cinematography plan for a scene, produced by Cinematographer_Agent.

    Contains 1–20 shots, research sources, and director's notes.
    """

    plan_id: str
    scene_id: str
    shots: list[Shot] = Field(min_length=1, max_length=20)
    research_sources: list[ResearchSource]
    research_warning: Optional[str] = None
    cinematographer_notes: str


class DroneStatus(BaseModel):
    """Real-time status snapshot of a virtual drone."""

    drone_id: str
    name: str
    position: Vector3
    orientation: dict  # quaternion {x, y, z, w}
    is_recording: bool
    active_shot: Optional[Shot] = None


class SimulationState(str, Enum):
    """Lifecycle states for a simulation run."""

    CREATED = "CREATED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"


class Simulation(BaseModel):
    """A simulation run that executes a ShotPlan using the DroneManager."""

    simulation_id: str
    scene_id: str
    state: SimulationState
    created_at: str  # ISO 8601 UTC
    updated_at: str

# Parallele search

class SourceReference(BaseModel):
    """A single retrieved web source backing a research query."""

    title: str
    url: str
    excerpt: str  # LLM-optimized excerpt from Parallel, used to ground rationale


class ResearchSource(BaseModel):
    """One research query and what it found. `reference_count` stays as a
    derived property so existing UI code (Requirement 10.4) keeps working
    unchanged."""

    query: str
    references: list[SourceReference] = Field(default_factory=list)

    @property
    def reference_count(self) -> int:
        return len(self.references)