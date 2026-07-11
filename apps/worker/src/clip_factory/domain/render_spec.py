from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Literal, Mapping


def freeze(value: Any) -> Any:
    if isinstance(value, dict):
        return MappingProxyType({key: freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(freeze(item) for item in value)
    return value


@dataclass(frozen=True)
class RenderSpec:
    schema_version: Literal["1.0.0"]
    render_id: str
    clip_id: str
    source: Mapping[str, Any]
    canvas: tuple[int, int]
    range_ms: tuple[int, int]
    crop_track: tuple[Mapping[str, Any], ...]
    captions: tuple[Mapping[str, Any], ...]
    style: Mapping[str, Any]
    title: str | None
    encoder: Mapping[str, Any]
    platform_preset: str
