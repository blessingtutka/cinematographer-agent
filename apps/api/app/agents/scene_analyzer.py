"""Scene_Analyzer agent — extracts structured scene data from raw screenplay text.

Calls the Gemini API with a structured output schema (SceneAnalysis) to parse
characters, actions, emotions, cinematic beats, and dialogue from the scene.

Error mapping
-------------
- Any exception raised by the google.generativeai SDK  → GeminiError (→ HTTP 502)
- Post-Gemini failures (e.g., Pydantic ValidationError) → InternalProcessingError (→ HTTP 500)
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import uuid
import warnings

# Suppress the FutureWarning emitted by google-generativeai 0.x on import
with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai

from pydantic import ValidationError

from app.agents.exceptions import GeminiError, InternalProcessingError
from app.config import get_settings
from cinematography_schema.schema import (
    Action,
    Character,
    CinematicBeat,
    DialogueLine,
    EmotionalTone,
    SceneAnalysis,
    Vector3,
)

logger = logging.getLogger(__name__)

# Gemini model to use for scene analysis
_GEMINI_MODEL = "gemini-3.5-flash"
_MAX_RATE_LIMIT_RETRIES = 1
_DEFAULT_RATE_LIMIT_DELAY_SECONDS = 1.0

_SYSTEM_PROMPT = """You are an expert screenplay analyst and cinematographer.
Analyze the provided screenplay scene and extract structured information.

Return a JSON object that strictly conforms to the SceneAnalysis schema:
- scene_id: a unique UUID string
- title: a concise descriptive title for the scene (3-8 words)
- raw_text: the original scene text, unchanged
- characters: all named characters with unique character_id (UUID), display_name, and
  initial_position as {x, y, z} floats (place characters at plausible stage positions)
- actions: all physical actions/movements, each with action_id (UUID), character_id
  referencing an extracted character, description, and timestamp_offset (seconds from scene start)
- emotions: list of dominant emotional tones from the allowed enum values:
  NEUTRAL, TENSE, ROMANTIC, MELANCHOLIC, JOYFUL, FEARFUL, ANGRY
- cinematic_beats: narratively/emotionally significant moments, each with beat_id (UUID),
  description, timestamp_offset (seconds), and significance_score (integer 1-10)
- dialogue: all dialogue lines with line_id (UUID), character_id, text, and
  narrative_position (0.0-1.0 float representing relative position in the scene)

Every character_id in actions and dialogue MUST reference a character in the characters list.
All IDs must be valid UUID strings."""


def _build_response_schema() -> dict:
    """Build the JSON schema dict for Gemini's response_schema parameter.

    google-generativeai 0.x accepts a plain dict describing the JSON Schema.
    We construct it manually from our Pydantic models to guarantee alignment.
    """
    return {
        "type": "object",
        "properties": {
            "scene_id": {"type": "string"},
            "title": {"type": "string"},
            "raw_text": {"type": "string"},
            "characters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "character_id": {"type": "string"},
                        "display_name": {"type": "string"},
                        "initial_position": {
                            "type": "object",
                            "properties": {
                                "x": {"type": "number"},
                                "y": {"type": "number"},
                                "z": {"type": "number"},
                            },
                            "required": ["x", "y", "z"],
                        },
                    },
                    "required": ["character_id", "display_name", "initial_position"],
                },
            },
            "actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action_id": {"type": "string"},
                        "character_id": {"type": "string"},
                        "description": {"type": "string"},
                        "timestamp_offset": {"type": "number"},
                    },
                    "required": [
                        "action_id",
                        "character_id",
                        "description",
                        "timestamp_offset",
                    ],
                },
            },
            "emotions": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [e.value for e in EmotionalTone],
                },
            },
            "cinematic_beats": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "beat_id": {"type": "string"},
                        "description": {"type": "string"},
                        "timestamp_offset": {"type": "number"},
                        "significance_score": {
                            "type": "integer",
                        },
                    },
                    "required": [
                        "beat_id",
                        "description",
                        "timestamp_offset",
                        "significance_score",
                    ],
                },
            },
            "dialogue": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "line_id": {"type": "string"},
                        "character_id": {"type": "string"},
                        "text": {"type": "string"},
                        "narrative_position": {"type": "number"},
                    },
                    "required": [
                        "line_id",
                        "character_id",
                        "text",
                        "narrative_position",
                    ],
                },
            },
        },
        "required": [
            "scene_id",
            "title",
            "raw_text",
            "characters",
            "actions",
            "emotions",
            "cinematic_beats",
            "dialogue",
        ],
    }


def _get_client() -> genai.GenerativeModel:
    """Initialise and return a configured Gemini GenerativeModel.

    The API key is read from Settings on each call so that tests can patch
    `get_settings` without module-level side effects.
    """
    settings = get_settings()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FutureWarning)
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=_GEMINI_MODEL,
            system_instruction=_SYSTEM_PROMPT,
        )
    return model


async def analyze_scene(raw_text: str) -> SceneAnalysis:
    """Analyze a raw screenplay scene and return a structured SceneAnalysis.

    Calls Gemini with a structured output schema; the model returns JSON that
    is then validated against the SceneAnalysis Pydantic model.

    Parameters
    ----------
    raw_text:
        The raw screenplay scene text to analyze.

    Returns
    -------
    SceneAnalysis
        Validated, structured scene analysis.

    Raises
    ------
    GeminiError
        Wraps any exception raised by the google.generativeai SDK (→ HTTP 502).
    InternalProcessingError
        Raised when post-Gemini processing fails, e.g. Pydantic validation
        failure parsing the Gemini response (→ HTTP 500).
    """
    logger.debug(
        "Scene_Analyzer: starting analysis, estimated input tokens ~%d",
        len(raw_text) // 4,
    )

    prompt = f"Analyze the following screenplay scene:\n\n{raw_text}"
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        response_schema=_build_response_schema(),
    )

    start_time = time.monotonic()
    raw_json: str | None = None

    for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
        try:
            # google-generativeai does not provide a native async generate method,
            # so we offload the blocking call to a thread executor.
            model = _get_client()
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config=generation_config,
                ),
            )
            raw_json = response.text
            break
        except Exception as exc:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            logger.debug(
                "Scene_Analyzer: Gemini call %d/%d failed after %.1f ms — %s",
                attempt + 1,
                _MAX_RATE_LIMIT_RETRIES + 1,
                elapsed_ms,
                exc,
            )
            if "429" not in str(exc) or attempt >= _MAX_RATE_LIMIT_RETRIES:
                raise GeminiError(
                    f"Gemini API error during scene analysis: {exc}"
                ) from exc

            delay_match = re.search(r"retry in ([0-9]+(?:\.[0-9]+)?)s", str(exc), re.IGNORECASE)
            delay_seconds = float(delay_match.group(1)) if delay_match else _DEFAULT_RATE_LIMIT_DELAY_SECONDS
            logger.info("Scene_Analyzer: Gemini rate limit; retrying in %.1f seconds", delay_seconds)
            await asyncio.sleep(delay_seconds)

    if raw_json is None:
        raise GeminiError("Gemini API returned no scene analysis response")

    elapsed_ms = (time.monotonic() - start_time) * 1000
    logger.debug(
        "Scene_Analyzer: Gemini responded in %.1f ms",
        elapsed_ms,
    )

    try:
        # Gemini may omit scene_id / use a placeholder; normalise it to a
        # fresh UUID so callers always receive a unique, valid identifier.
        import json as _json

        payload = _json.loads(raw_json)

        # Always assign a fresh scene_id — the LLM cannot guarantee uniqueness.
        payload["scene_id"] = str(uuid.uuid4())

        # Ensure raw_text is echoed back exactly as submitted.
        payload["raw_text"] = raw_text

        scene_analysis = SceneAnalysis.model_validate(payload)
    except ValidationError as exc:
        logger.debug(
            "Scene_Analyzer: Pydantic validation failed — %s",
            exc,
        )
        raise InternalProcessingError(
            f"Scene analysis response failed schema validation: {exc}"
        ) from exc
    except Exception as exc:
        logger.debug(
            "Scene_Analyzer: post-Gemini processing failed — %s",
            exc,
        )
        raise InternalProcessingError(
            f"Scene analysis internal processing error: {exc}"
        ) from exc

    logger.debug(
        "Scene_Analyzer: completed — scene_id=%s, characters=%d, beats=%d",
        scene_analysis.scene_id,
        len(scene_analysis.characters),
        len(scene_analysis.cinematic_beats),
    )

    return scene_analysis
