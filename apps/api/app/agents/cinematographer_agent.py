"""Cinematographer_Agent — combines scene analysis, research, and drone
inventory into a validated ShotPlan.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
import warnings

with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai

from pydantic import BaseModel, ValidationError

from app.agents.exceptions import GeminiError, InvalidDroneAssignmentError, ShotPlanValidationError
from app.agents.research_agent import ResearchContext
from cinematography_schema.schema import (
    CameraMovement,
    SceneAnalysis,
    Shot,
    ShotPlan,
    ShotType,
    Vector3,
)

from ..config import get_settings

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-3.5-flash"
_MAX_ATTEMPTS = 3  # 1 initial + 2 retries


class DroneInfo(BaseModel):
    """Minimal drone-inventory entry the Cinematographer_Agent needs to
    constrain shot assignment.
    
    Placeholder pending task for real `Drone`
    """

    drone_id: str
    name: str
    home_position: Vector3 | None = None


_SYSTEM_PROMPT = """You are an expert film cinematographer directing camera drones.
Given a scene's structured analysis, real cinematography research, and the
drones available to you, produce a shot list.

Return a JSON object with exactly two top-level fields:
- shots: an ordered list of 1 to 20 shots covering the scene in narrative order
- cinematographer_notes: a short overall summary (1-2 sentences) of your creative approach

Each shot must have:
- shot_id: a placeholder UUID string (will be replaced, but must be present and unique)
- sequence: this shot's 1-based position in the list
- shot_type: exactly one of WIDE, MEDIUM, CLOSE_UP, EXTREME_CLOSE_UP, OVER_SHOULDER, LOW_ANGLE, HIGH_ANGLE
- camera_movement: exactly one of STATIC, MOVE_TO, DOLLY_IN, DOLLY_OUT, TRACK, FOLLOW, ORBIT, PAN, TILT
- drone_name: MUST be exactly one of the drone names given to you below — never invent a drone name
- subject: what/who the shot is framed on (e.g. a character's display_name, or "wide establishing")
- duration_seconds: a positive number of seconds this shot should run
- rationale: 1-500 characters explaining WHY this framing and movement fits the scene's
  emotional and narrative context at this moment. Where the provided research is relevant,
  ground your rationale in it explicitly (e.g. reference the technique or convention it
  describes) rather than justifying the choice from generic knowledge alone. If a director
  style reference was provided, explain how this shot reflects that director's habits.
- cinematic_beat_id: the beat_id of the CinematicBeat this shot covers, if any, else omit

Sequence shots in narrative order aligned with the scene's cinematic beats — earlier beats
get earlier shots. Cover every character with meaningful dialogue or action at least once
across the shot list where the shot count allows it."""


def _build_response_schema() -> dict:
    """JSON schema for the fields Gemini actually generates. plan_id,
    scene_id, research_sources, research_warning, and per-shot shot_id are
    injected afterward — see module docstring."""
    return {
        "type": "object",
        "properties": {
            "shots": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "shot_id": {"type": "string"},
                        "sequence": {"type": "integer"},
                        "shot_type": {
                            "type": "string",
                            "enum": [t.value for t in ShotType],
                        },
                        "camera_movement": {
                            "type": "string",
                            "enum": [m.value for m in CameraMovement],
                        },
                        "drone_name": {"type": "string"},
                        "subject": {"type": "string"},
                        "duration_seconds": {"type": "number"},
                        "rationale": {"type": "string"},
                        "cinematic_beat_id": {"type": "string"},
                    },
                    "required": [
                        "shot_id",
                        "sequence",
                        "shot_type",
                        "camera_movement",
                        "drone_name",
                        "subject",
                        "duration_seconds",
                        "rationale",
                    ],
                },
            },
            "cinematographer_notes": {"type": "string"},
        },
        "required": ["shots", "cinematographer_notes"],
    }


def _get_client() -> genai.GenerativeModel:
    settings = get_settings()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FutureWarning)
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=_GEMINI_MODEL,
            system_instruction=_SYSTEM_PROMPT,
        )
    return model


def _format_research_for_prompt(research_context: ResearchContext) -> str:
    if not research_context.research_sources:
        note = research_context.research_warning or "no research sources were retrieved"
        return f"(No cinematography research available: {note}. Plan from scene analysis alone.)"

    lines: list[str] = []
    for source in research_context.research_sources:
        lines.append(f"Research topic: {source.query}")
        for ref in getattr(source, "references", [])[:3]:
            lines.append(f'  - "{ref.title}": {ref.excerpt}')
    return "\n".join(lines)


def _format_scene_for_prompt(scene_analysis: SceneAnalysis) -> str:
    characters = ", ".join(
        f"{c.display_name} (id={c.character_id})" for c in scene_analysis.characters
    )
    beats = "\n".join(
        f"  - beat_id={b.beat_id} @ {b.timestamp_offset}s (significance {b.significance_score}/10): {b.description}"
        for b in sorted(scene_analysis.cinematic_beats, key=lambda b: b.timestamp_offset)
    )
    emotions = ", ".join(e.value for e in scene_analysis.emotions)
    dialogue_count = len(scene_analysis.dialogue)

    lines = [
        f"Title: {scene_analysis.title}",
        f"Characters: {characters or '(none extracted)'}",
        f"Emotional tone(s): {emotions or 'NEUTRAL'}",
        f"Dialogue line count: {dialogue_count}",
        "Cinematic beats (in narrative order):",
        beats or "  (none extracted)",
    ]

    style_reference = getattr(scene_analysis, "style_reference", None)
    if style_reference:
        lines.append(
            f"Requested visual style: shoot this scene in the style of {style_reference}. "
            f"Use the director-style research below to inform shot choices."
        )

    return "\n".join(lines)


def _build_prompt(
    scene_analysis: SceneAnalysis,
    research_context: ResearchContext,
    drone_inventory: list[DroneInfo],
) -> str:
    drone_names = ", ".join(d.name for d in drone_inventory)
    return (
        f"Scene analysis:\n{_format_scene_for_prompt(scene_analysis)}\n\n"
        f"Cinematography research:\n{_format_research_for_prompt(research_context)}\n\n"
        f"Available drones (use ONLY these names for drone_name): {drone_names}\n\n"
        f"Produce the shot list now."
    )


def _assemble_shot_plan(
    raw_payload: dict,
    scene_analysis: SceneAnalysis,
    research_context: ResearchContext,
    drone_names: set[str],
) -> ShotPlan:
    """Inject pipeline-owned fields, enforce drone-name membership, and
    validate the fully-assembled ShotPlan against the schema."""
    shots_raw = raw_payload.get("shots", [])
    if not shots_raw:
        raise ValidationError.from_exception_data(
            "ShotPlan", [{"type": "too_short", "loc": ("shots",), "input": shots_raw}]
        )

    assembled_shots = []
    for index, shot_raw in enumerate(shots_raw, start=1):
        drone_name = shot_raw.get("drone_name")
        if drone_name not in drone_names:
            raise InvalidDroneAssignmentError(
                f"Shot references unknown drone_name={drone_name!r}; "
                f"available drones: {sorted(drone_names)}"
            )
        # shot_id and sequence are pipeline-owned — always overwrite so
        # uniqueness/ordering never depends on the model getting it right.
        shot_raw = {**shot_raw, "shot_id": str(uuid.uuid4()), "sequence": index}
        assembled_shots.append(shot_raw)

    plan_payload = {
        "plan_id": str(uuid.uuid4()),
        "scene_id": scene_analysis.scene_id,
        "shots": assembled_shots,
        "research_sources": research_context.research_sources,
        "research_warning": research_context.research_warning,
        "research_confidence": research_context.research_confidence,
        "cinematographer_notes": raw_payload.get("cinematographer_notes", ""),
    }

    return ShotPlan.model_validate(plan_payload)


async def plan(
    scene_analysis: SceneAnalysis,
    research_context: ResearchContext,
    drone_inventory: list[DroneInfo],
) -> ShotPlan:
    """Produce a validated ShotPlan grounded in scene analysis, cinematography
    research, and the currently available drone inventory.

    Raises
    ------
    GeminiError
        Every Gemini call attempt failed (→ HTTP 502).
    ShotPlanValidationError
        Every attempt produced a ShotPlan that failed validation, including
        an invalid drone assignment (→ HTTP 500).
    """
    if not drone_inventory:
        raise ShotPlanValidationError(
            "Cannot plan shots: drone_inventory is empty, no drone available for assignment"
        )

    drone_names = {d.name for d in drone_inventory}
    prompt = _build_prompt(scene_analysis, research_context, drone_inventory)
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        response_schema=_build_response_schema(),
    )

    logger.debug(
        "Cinematographer_Agent: starting planning for scene_id=%s, drones=%d",
        scene_analysis.scene_id,
        len(drone_inventory),
    )

    last_gemini_error: Exception | None = None
    last_validation_error: Exception | None = None

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        start_time = time.monotonic()
        try:
            model = _get_client()
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(prompt, generation_config=generation_config),
            )
            raw_json = response.text
        except Exception as exc:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            logger.debug(
                "Cinematographer_Agent: attempt %d/%d — Gemini call failed after %.1f ms — %s",
                attempt,
                _MAX_ATTEMPTS,
                elapsed_ms,
                exc,
            )
            last_gemini_error = exc
            if attempt == _MAX_ATTEMPTS:
                raise GeminiError(
                    f"Gemini API error during shot planning: {exc}"
                ) from exc
            continue

        elapsed_ms = (time.monotonic() - start_time) * 1000
        logger.debug(
            "Cinematographer_Agent: attempt %d/%d — Gemini responded in %.1f ms",
            attempt,
            _MAX_ATTEMPTS,
            elapsed_ms,
        )

        try:
            import json as _json

            raw_payload = _json.loads(raw_json)
            shot_plan = _assemble_shot_plan(
                raw_payload, scene_analysis, research_context, drone_names
            )
        except (ValidationError, InvalidDroneAssignmentError) as exc:
            logger.debug(
                "Cinematographer_Agent: attempt %d/%d — validation failed — %s",
                attempt,
                _MAX_ATTEMPTS,
                exc,
            )
            last_validation_error = exc
            if attempt == _MAX_ATTEMPTS:
                raise ShotPlanValidationError(
                    "ShotPlan validation failed after 3 attempts"
                ) from exc
            continue

        logger.debug(
            "Cinematographer_Agent: completed — plan_id=%s, shots=%d",
            shot_plan.plan_id,
            len(shot_plan.shots),
        )
        return shot_plan

    # Unreachable: the loop above always either returns or raises on the
    # final attempt. Kept as a defensive guard against future edits.
    raise ShotPlanValidationError(
        "ShotPlan validation failed after 3 attempts"
    ) from (last_validation_error or last_gemini_error)