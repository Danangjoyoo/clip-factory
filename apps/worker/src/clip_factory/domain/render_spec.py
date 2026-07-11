from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class RenderSpec:
    schema_version: Literal["1.0.0"]
    render_id: str
    clip_id: str
    source: dict
    canvas: tuple[int, int]
    range_ms: tuple[int, int]
    crop_track: tuple[dict, ...]
    captions: tuple[dict, ...]
    style: dict
    title: str | None
    encoder: dict
    platform_preset: str
