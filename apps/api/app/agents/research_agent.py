"""Research_Agent — grounds shot planning in real cinematography convention.

Before the Cinematographer_Agent commits to a shot list, this agent queries
the Parallel Search API for how the scene's emotional tone and cinematic
beats are conventionally covered on film. This is the explainability seam:
the Cinematographer_Agent doesn't guess a shot list from generic training
knowledge — it plans against citable, retrieved film-craft excerpts, and a
Shot's `rationale` can point at a real source instead of hand-waving.

Each topic (an emotional tone or a cinematic beat) gets
ONE Parallel Search call shaped the way Parallel's docs specify:

    - `objective`: a natural-language statement of search intent
    - `search_queries`: 2-3 SHORT keyword phrases (3-6 words), never full
      sentences - Parallel's own docs flag full-sentence queries as an
      anti-pattern that degrades ranking quality.

Topics run concurrently via `asyncio.gather` so the UI can still show one
ResearchSource per topic with its own reference count (Requirement 10.4),
while each individual call to Parallel follows best practice internally.

If `scene_analysis.style_reference` is set (e.g. "Denis Villeneuve", "give it
a Fincher feel"), an additional topic researches that director's known
blocking/lensing/movement habits, letting the Cinematographer_Agent adapt
its shot choices to a requested visual style instead of a generic default.

Error mapping / fallback behavior
--------------------------------------------------
- Parallel returns zero results for every topic  → proceed with
  `ResearchContext(research_sources=[])`, no warning (Req 3.4).
- Parallel does not respond within 10s overall    → proceed with
  `ResearchContext(research_sources=[], research_warning=...)` (Req 3.5).
- An individual topic's call errors (non-timeout) → that topic is dropped
  and logged; does not fail the whole research pass.
"""

from __future__ import annotations

import asyncio
import logging
import time

from parallel import AsyncParallel
from pydantic import BaseModel, Field

from cinematography_schema.schema import (
    EmotionalTone,
    ResearchSource,
    SceneAnalysis,
    SourceReference,
)

from ..config import get_settings

logger = logging.getLogger(__name__)

_RESEARCH_TIMEOUT_SECONDS = 10.0

# "fast" mode targets ~700ms p50 per Parallel's docs
_SEARCH_MODE = "fast"
_MAX_RESULTS_PER_TOPIC = 5


class ResearchContext(BaseModel):
    """Output of the Research_Agent, consumed by the Cinematographer_Agent."""

    research_sources: list[ResearchSource] = Field(default_factory=list)
    research_warning: str | None = None


# ---------------------------------------------------------------------------
# Topic construction — each topic becomes ONE well-formed Parallel call
# ---------------------------------------------------------------------------

# Per-tone (objective, short keyword variants) topics for parallel search
_TONE_TOPICS: dict[str, tuple[str, list[str]]] = {
    "TENSE": (
        "Cinematography conventions for shooting a tense scene: camera "
        "angles, framing, and blocking used to build suspense on film.",
        ["180 degree rule tension", "close-up building suspense", "confrontation scene coverage"],
    ),
    "ROMANTIC": (
        "Cinematography conventions for shooting a romantic scene: intimate "
        "framing, lens choice, and camera movement.",
        ["intimate two-shot coverage", "romantic scene lens choice", "soft lighting romantic scene"],
    ),
    "MELANCHOLIC": (
        "Cinematography conventions for shooting a melancholic scene: slow "
        "camera movement, wide framing, and pacing.",
        ["slow push-in technique", "wide shot melancholic scene", "static camera grief scene"],
    ),
    "JOYFUL": (
        "Cinematography conventions for shooting a joyful ensemble scene: "
        "dynamic camera movement and energetic coverage.",
        ["handheld dynamic coverage", "joyful scene camera movement", "ensemble scene blocking"],
    ),
    "FEARFUL": (
        "Cinematography conventions for shooting a fearful scene: "
        "disorienting angles and unsettling framing.",
        ["low angle disorienting shot", "fear scene camera technique", "unsettling framing horror"],
    ),
    "ANGRY": (
        "Cinematography conventions for shooting an angry confrontation "
        "scene: close coverage and cutting rhythm.",
        ["shot reverse shot confrontation", "close-up angry dialogue", "confrontation cutting rhythm"],
    ),
    "NEUTRAL": (
        "Standard cinematography conventions for shooting a dialogue scene: "
        "master shot coverage and typical blocking.",
        ["master shot coverage technique", "dialogue scene blocking", "standard coverage pattern"],
    ),
}

def _build_style_topic(style_reference: str) -> tuple[str, list[str]]:
    """Build a director/style-matching topic (Requirement: style-matching on
    request, e.g. "shoot this like a Denis Villeneuve scene").

    This is deliberately a SEPARATE topic from tone/beat topics
    """
    objective = (
        f"Cinematographic style, blocking, lensing, and camera movement "
        f"habits characteristic of the work of {style_reference}, as "
        f"documented in film analysis and interviews."
    )
    keywords = [
        f"{style_reference} camera style",
        f"{style_reference} blocking technique",
        f"{style_reference} lens choices",
    ]
    return objective, keywords


_FALLBACK_TOPICS: list[tuple[str, list[str]]] = [
    (
        "Standard cinematography conventions for shooting a dialogue scene.",
        ["dialogue scene shot coverage", "standard scene blocking technique"],
    ),
    (
        "Cinematography conventions for establishing shots and scene coverage patterns.",
        ["establishing shot technique", "scene coverage pattern film"],
    ),
]


def _build_topics(scene_analysis: SceneAnalysis) -> list[tuple[str, list[str]]]:
    """Build >= 2 (objective, short_keyword_queries) topics from the scene's
    emotional tone and cinematic beats, plus a
    director/style-matching topic when the user requested one.

    Two-character scenes bias toward shot-reverse-shot phrasing since that's
    the canonical coverage pattern for two-person dialogue.
    """
    topics: list[tuple[str, list[str]]] = []
    two_person = len(scene_analysis.characters) == 2

    # Style-matching topic first
    style_reference = getattr(scene_analysis, "style_reference", None)
    if style_reference:
        topics.append(_build_style_topic(style_reference))

    seen_tones: set[EmotionalTone] = set()
    for tone in scene_analysis.emotions:
        if tone in seen_tones:
            continue
        seen_tones.add(tone)
        objective, keywords = _TONE_TOPICS.get(
            tone.value.upper(),
            (
                f"Cinematography conventions for a {tone.value.lower()} scene.",
                [f"{tone.value.lower()} scene coverage", f"{tone.value.lower()} scene camera technique"],
            ),
        )
        if two_person:
            keywords = ["shot reverse shot two-person"] + keywords[:2]
        topics.append((objective, keywords))

    for beat in scene_analysis.cinematic_beats:
        description = beat.description.strip()
        if not description:
            continue
        objective = (
            f"Cinematography and camera technique conventions for filming a key "
            f"narrative moment described as: {description}."
        )
        # Keep keyword variants short - derive from the beat
        short = " ".join(description.split()[:4])
        keywords = [f"{short} shot technique", "cinematic beat coverage technique"]
        topics.append((objective, keywords))

    # De-duplicate by objective while preserving order.
    seen_objectives: set[str] = set()
    deduped: list[tuple[str, list[str]]] = []
    for objective, keywords in topics:
        if objective not in seen_objectives:
            seen_objectives.add(objective)
            deduped.append((objective, keywords))

    if len(deduped) < 2:
        for fallback in _FALLBACK_TOPICS:
            if fallback[0] not in seen_objectives:
                seen_objectives.add(fallback[0])
                deduped.append(fallback)
            if len(deduped) >= 2:
                break

    return deduped


# ---------------------------------------------------------------------------
# Parallel Search execution
# ---------------------------------------------------------------------------

async def _search_topic(
    client: AsyncParallel, objective: str, search_queries: list[str]
) -> ResearchSource | None:
    """Execute one Parallel Search call for a topic and extract citable
    excerpts. Returns None on any failure so the caller can
    drop this topic without failing the whole batch."""
    try:
        search = await client.search(
            objective=objective,
            search_queries=search_queries[:3],
            mode=_SEARCH_MODE,
            max_results=_MAX_RESULTS_PER_TOPIC,
        )
    except Exception as exc:  # noqa: BLE001 #  deliberately broad, see module docstring
        logger.debug(
            "Research_Agent: Parallel call failed, dropping topic — objective=%r error=%s",
            objective,
            exc,
        )
        return None

    if getattr(search, "warnings", None):
        logger.debug("Research_Agent: Parallel warnings for %r — %s", objective, search.warnings)

    references = [
        SourceReference(
            title=result.title or "Untitled source",
            url=result.url,
            excerpt=(result.excerpts[0] if result.excerpts else "")[:1500],
        )
        for result in search.results
        if result.url and result.excerpts
    ]

    if not references:
        return None

    return ResearchSource(query=objective, references=references)


async def research(scene_analysis: SceneAnalysis) -> ResearchContext:
    """Ground upcoming shot planning in real cinematography convention.

    Builds >= 2 topics from the scene's emotional tone and cinematic beats,
    runs one Parallel Search call per topic concurrently, all bounded by a
    10-second overall timeout, and returns citable excerpts the
    Cinematographer_Agent can reference when justifying shot choices.
    """
    settings = get_settings()
    topics = _build_topics(scene_analysis)

    logger.debug(
        "Research_Agent: starting research for scene_id=%s, topic_count=%d",
        scene_analysis.scene_id,
        len(topics),
    )

    start_time = time.monotonic()

    try:
        async with AsyncParallel(api_key=settings.parallel_api_key) as client:
            results = await asyncio.wait_for(
                asyncio.gather(
                    *[_search_topic(client, objective, keywords) for objective, keywords in topics]
                ),
                timeout=_RESEARCH_TIMEOUT_SECONDS,
            )
    except asyncio.TimeoutError:
        elapsed_ms = (time.monotonic() - start_time) * 1000
        logger.warning(
            "Research_Agent: timed out after %.1f ms for scene_id=%s — proceeding without research",
            elapsed_ms,
            scene_analysis.scene_id,
        )
        return ResearchContext(
            research_sources=[],
            research_warning="Research data unavailable: timeout",
        )

    elapsed_ms = (time.monotonic() - start_time) * 1000
    research_sources = [source for source in results if source is not None]

    if not research_sources:
        # Every topic either failed or returned nothing usable - proceed on
        # scene analysis alone, no warning.
        logger.debug(
            "Research_Agent: no usable results across %d topic(s) (%.1f ms) — proceeding without research",
            len(topics),
            elapsed_ms,
        )
        return ResearchContext(research_sources=[])

    logger.debug(
        "Research_Agent: completed in %.1f ms — sources=%d, total_references=%d",
        elapsed_ms,
        len(research_sources),
        sum(s.reference_count for s in research_sources),
    )

    return ResearchContext(research_sources=research_sources)