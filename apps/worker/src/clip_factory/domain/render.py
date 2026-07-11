from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping

from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec


@dataclass(frozen=True)
class RenderSnapshot:
    """The exact, serialisable input captured when a render is queued."""

    spec: RenderSpec
    source_version: str
    source_sha256: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "schemaVersion": self.spec.schema_version,
            "renderId": self.spec.render_id,
            "clipId": self.spec.clip_id,
            "source": dict(self.spec.source),
            "canvas": {"width": self.spec.canvas[0], "height": self.spec.canvas[1]},
            "range": {"startMs": self.spec.range_ms[0], "endMs": self.spec.range_ms[1]},
            "cropTrack": [dict(value) for value in self.spec.crop_track],
            "captions": [dict(value) for value in self.spec.captions],
            "style": dict(self.spec.style),
            "title": self.spec.title,
            "encoder": dict(self.spec.encoder),
            "platformPreset": self.spec.platform_preset,
            "sourceVersion": self.source_version,
            "sourceSha256": self.source_sha256,
        }

    def fingerprint(self) -> str:
        encoded = json.dumps(self.to_dict(), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


class RenderOutputError(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def validate_output(
    probe: MediaProbe, expected_duration_ms: int, tolerance_ms: int = 100
) -> None:
    if (
        probe.container != "mp4"
        or probe.width != 1080
        or probe.height != 1920
        or probe.video_codec not in {"h264", "avc1"}
        or probe.audio_codec not in {"aac", "mp4a"}
        or abs(probe.duration_ms - expected_duration_ms) > tolerance_ms
    ):
        raise RenderOutputError("RENDER_OUTPUT_INVALID")


def artifact_key(project_id: str, clip_id: str, render_id: str) -> str:
    """Stable key; render IDs are immutable and safe to retry."""
    return f"projects/{project_id}/clips/{clip_id}/renders/{render_id}.mp4"
