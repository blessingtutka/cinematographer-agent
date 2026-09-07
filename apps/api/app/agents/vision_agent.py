"""Vision_Agent — realtime AI vision analysis for in-flight drone cameras.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
import warnings
from datetime import datetime, timezone

with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai

from cinematography_schema.schema import (
    DroneStatus,
    SceneAnalysis,
    VisionAnalysis,
    VisionDetectedObject,
    DroneCommandAdjustment,
)

from ..config import get_settings

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-1.5-flash"
_VISION_TIMEOUT_SECONDS = 3.0

# Only call Gemini once every N simulation ticks per drone.
# At 10 Hz sim rate this gives ~2 Hz vision updates per drone.
VISION_TICK_INTERVAL = 5

_SYSTEM_PROMPT = """You are the onboard AI vision system of a cinematography drone.

Given a structured description of the drone's current camera viewpoint and the
scene it is filming, produce a realtime visual analysis.

Return a JSON object with exactly these fields:

- scene_description: one sentence (max 150 chars) describing what the camera
  currently sees — as if you are narrating a live feed.

- detected_objects: an array of objects in frame. Each object has:
    - label: short string, format "TYPE: name" where TYPE is one of
      CHARACTER, PROP, ENVIRONMENT, LIGHT, HAZARD
    - confidence: float in [0.0, 1.0]
    - position_hint: optional string like "foreground left",
      "background centre", "mid-frame right"

- composition_score: integer 1-10 rating current framing quality.
  Consider rule of thirds, subject prominence, depth, leading lines.

- recommended_adjustment: null, OR an object with:
    - adjustment_type: one of REFRAME, TRACK_SUBJECT, ADJUST_ALTITUDE,
      CHANGE_MOVEMENT, HOLD_POSITION, ZOOM_IN, ZOOM_OUT, ABORT_SHOT
    - rationale: max 200 chars explaining why, grounded in what you see
    - urgency: integer 1-5 (1 = advisory, 5 = act immediately)

Only recommend an adjustment when the composition_score is below 6 OR a
significant subject has moved out of frame.  Do NOT recommend an adjustment
for well-composed shots (score >= 7).
"""


def _build_response_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "scene_description": {"type": "string"},
            "detected_objects": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "confidence": {"type": "number"},
                        "position_hint": {"type": "string"},
                    },
                    "required": ["label", "confidence"],
                },
            },
            "composition_score": {"type": "integer"},
            "recommended_adjustment": {
                "type": "object",
                "properties": {
                    "adjustment_type": {"type": "string"},
                    "rationale": {"type": "string"},
                    "urgency": {"type": "integer"},
                },
                "required": ["adjustment_type", "rationale", "urgency"],
                "nullable": True,
            },
        },
        "required": ["scene_description", "detected_objects", "composition_score"],
    }


def _build_viewpoint_prompt(
    drone: DroneStatus,
    scene: SceneAnalysis,
) -> str:
    """Synthesise a rich viewpoint description from simulation state.

    This is the 'virtual camera frame' description that replaces actual pixels
    in a synthetic environment.
    """
    pos = drone.position
    shot = drone.active_shot

    # -- Shot context --
    if shot:
        shot_ctx = (
            f"Shot type: {shot.shot_type}\n"
            f"Camera movement: {shot.camera_movement}\n"
            f"Primary subject: {shot.subject}\n"
            f"Shot rationale: {shot.rationale}\n"
            f"Progress: {getattr(drone, 'trajectory_progress', 0.5):.0%} complete\n"
        )
    else:
        shot_ctx = "Shot type: STANDBY — drone is between shots\n"

    # -- Character visibility — which characters are plausibly in frame --
    in_frame_chars: list[str] = []
    for char in scene.characters:
        cp = char.initial_position
        # Rough frustum check: within ~6 units in x/z and within altitude envelope
        dx = abs(cp.x - pos.x)
        dz = abs(cp.z - pos.z)
        if dx < 6 and dz < 8:
            in_frame_chars.append(
                f"{char.display_name} at approx ({cp.x:.1f}, {cp.z:.1f})"
            )

    char_ctx = (
        "Characters plausibly in frame: " + ", ".join(in_frame_chars)
        if in_frame_chars
        else "No characters are currently in the camera's field of view"
    )

    # -- Active beat --
    active_beats = sorted(scene.cinematic_beats, key=lambda b: b.timestamp_offset)
    beat_ctx = (
        f"Current narrative beat: {active_beats[0].description} "
        f"(significance {active_beats[0].significance_score}/10)"
        if active_beats
        else "No cinematic beat active"
    )

    # -- Emotional tone --
    emotion_ctx = "Scene emotion(s): " + ", ".join(e.value for e in scene.emotions)

    prompt = (
        f"Drone: {drone.name} (ID: {drone.drone_id})\n"
        f"Camera position: x={pos.x:.2f}, y={pos.y:.2f}, z={pos.z:.2f}\n"
        f"Recording: {'YES' if drone.is_recording else 'NO'}\n\n"
        f"{shot_ctx}\n"
        f"{char_ctx}\n"
        f"{beat_ctx}\n"
        f"{emotion_ctx}\n\n"
        "Analyse this drone's current camera viewpoint and produce the visual analysis."
    )
    return prompt


def _get_client() -> genai.GenerativeModel:
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(
        model_name=_GEMINI_MODEL,
        system_instruction=_SYSTEM_PROMPT,
    )


def _parse_response(raw_json: str, drone: DroneStatus) -> VisionAnalysis:
    """Parse Gemini's JSON into a validated VisionAnalysis."""
    payload = json.loads(raw_json)

    detected = [
        VisionDetectedObject(
            label=obj.get("label", "UNKNOWN"),
            confidence=float(obj.get("confidence", 0.5)),
            position_hint=obj.get("position_hint"),
        )
        for obj in payload.get("detected_objects", [])
    ]

    adj_raw = payload.get("recommended_adjustment")
    adjustment = (
        DroneCommandAdjustment(
            adjustment_type=adj_raw.get("adjustment_type", "REFRAME"),
            rationale=str(adj_raw.get("rationale", ""))[:300],
            urgency=int(adj_raw.get("urgency", 3)),
        )
        if adj_raw and isinstance(adj_raw, dict)
        else None
    )

    return VisionAnalysis(
        drone_id=drone.drone_id,
        drone_name=drone.name,
        timestamp=datetime.now(timezone.utc).isoformat(),
        scene_description=str(payload.get("scene_description", ""))[:500],
        detected_objects=detected,
        composition_score=max(1, min(10, int(payload.get("composition_score", 5)))),
        recommended_adjustment=adjustment,
        active_shot_id=drone.active_shot.shot_id if drone.active_shot else None,
    )


async def analyze_drone_view(
    drone: DroneStatus,
    scene: SceneAnalysis,
    last_analysis: VisionAnalysis | None = None,
) -> VisionAnalysis:
    """Produce a VisionAnalysis for a single drone's current camera frame.
    drone:
        Current DroneStatus snapshot for the drone being analysed.
    scene:
        The SceneAnalysis for the scene being simulated.
    last_analysis:
        The most recent VisionAnalysis for this drone; returned on timeout
        rather than blocking.
    """
    prompt = _build_viewpoint_prompt(drone, scene)
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        response_schema=_build_response_schema(),
    )

    start = time.monotonic()
    try:
        model = _get_client()
        loop = asyncio.get_running_loop()
        raw_json: str = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt, generation_config=generation_config
                ).text,
            ),
            timeout=_VISION_TIMEOUT_SECONDS,
        )
        vision = _parse_response(raw_json, drone)
        logger.debug(
            "Vision_Agent: %s analysed in %.0f ms — score=%d, objects=%d%s",
            drone.name,
            (time.monotonic() - start) * 1000,
            vision.composition_score,
            len(vision.detected_objects),
            f", adj={vision.recommended_adjustment.adjustment_type}"
            if vision.recommended_adjustment
            else "",
        )
        return vision

    except asyncio.TimeoutError:
        logger.debug(
            "Vision_Agent: timeout for %s after %.0f ms — reusing last analysis",
            drone.name,
            (time.monotonic() - start) * 1000,
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("Vision_Agent: error for %s — %s", drone.name, exc)

    # Graceful degradation — return stale analysis or safe fallback
    if last_analysis is not None:
        return last_analysis.model_copy(
            update={"timestamp": datetime.now(timezone.utc).isoformat()}
        )

    return VisionAnalysis(
        drone_id=drone.drone_id,
        drone_name=drone.name,
        timestamp=datetime.now(timezone.utc).isoformat(),
        scene_description=f"{drone.name} camera ready — awaiting analysis",
        detected_objects=[],
        composition_score=5,
        recommended_adjustment=None,
        active_shot_id=drone.active_shot.shot_id if drone.active_shot else None,
    )
