from __future__ import annotations

from typing import Any
from clip_factory.domain.render_spec import RenderSpec

_PLATFORMS = {"YOUTUBE_SHORTS", "INSTAGRAM_REELS", "TIKTOK"}
_STRATEGIES = {"VIDEOTOOLBOX", "SOFTWARE"}


def map_render_spec(payload: dict[str, Any]) -> RenderSpec:
    if payload.get("schemaVersion") != "1.0.0":
        raise ValueError("UNKNOWN_RENDER_SPEC_VERSION")
    if payload.get("platformPreset") not in _PLATFORMS:
        raise ValueError("UNKNOWN_PLATFORM_PRESET")
    source = payload.get("source")
    if not isinstance(source, dict) or source.get("kind") not in {
        "LOCAL_FILE",
        "BROWSER_UPLOAD",
    }:
        raise ValueError("UNKNOWN_SOURCE_KIND")
    encoder = payload.get("encoder")
    if not isinstance(encoder, dict) or encoder.get("strategy") not in _STRATEGIES:
        raise ValueError("UNKNOWN_ENCODER_STRATEGY")
    canvas = payload.get("canvas", {})
    span = payload.get("range", {})
    if (
        canvas.get("width") != 1080
        or canvas.get("height") != 1920
        or span.get("endMs", 0) <= span.get("startMs", -1)
    ):
        raise ValueError("INVALID_RENDER_RANGE")
    return RenderSpec(
        "1.0.0",
        str(payload["renderId"]),
        str(payload["clipId"]),
        dict(source),
        (1080, 1920),
        (int(span["startMs"]), int(span["endMs"])),
        tuple(payload.get("cropTrack", ())),
        tuple(payload.get("captions", ())),
        dict(payload.get("style", {})),
        payload.get("title"),
        dict(encoder),
        str(payload["platformPreset"]),
    )
