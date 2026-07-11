from __future__ import annotations

import re
from typing import Any
from pydantic import ValidationError
from clip_factory.domain.render_spec import freeze
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.entrypoints.contracts.generated.render_spec import RenderSpec as ContractRenderSpec


_ABSOLUTE_PATH = re.compile(r"^(?:/|[A-Za-z]:[\\/]|\\\\)")


def _reject_private_source_values(value: Any) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in {"path", "filepath", "resolvedpath", "candidatepath", "url"}:
                raise ValueError("PRIVATE_SOURCE_VALUE")
            _reject_private_source_values(item)
    elif isinstance(value, list):
        for item in value:
            _reject_private_source_values(item)
    elif isinstance(value, str) and (
        value.startswith(("file:", "http:", "https:"))
        or _ABSOLUTE_PATH.match(value) is not None
    ):
        raise ValueError("PRIVATE_SOURCE_VALUE")


def map_render_spec(payload: dict[str, Any]) -> RenderSpec:
    if payload.get("schemaVersion") != "1.0.0":
        raise ValueError("UNKNOWN_RENDER_SPEC_VERSION")
    _reject_private_source_values(payload.get("source"))
    try:
        contract = ContractRenderSpec.model_validate(payload)
    except ValidationError as error:
        raise ValueError("INVALID_RENDER_SPEC") from error
    data = contract.model_dump(mode="json")
    span = data["range"]
    if span["endMs"] <= span["startMs"]:
        raise ValueError("INVALID_RENDER_RANGE")
    for cue in data["captions"]:
        if cue["endMs"] <= cue["startMs"]:
            raise ValueError("INVALID_CAPTION_RANGE")
        for word in cue["words"]:
            if word["endMs"] <= word["startMs"] or not cue["startMs"] <= word["startMs"] <= word["endMs"] <= cue["endMs"]:
                raise ValueError("INVALID_CAPTION_WORD")
    return RenderSpec(
        "1.0.0",
        data["renderId"],
        data["clipId"],
        freeze(data["source"]),
        (1080, 1920),
        (span["startMs"], span["endMs"]),
        tuple(freeze(item) for item in data["cropTrack"]),
        tuple(freeze(item) for item in data["captions"]),
        freeze(data["style"]),
        data["title"],
        freeze(data["encoder"]),
        data["platformPreset"],
    )
