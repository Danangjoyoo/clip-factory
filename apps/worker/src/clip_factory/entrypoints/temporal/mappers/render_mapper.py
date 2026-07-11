from __future__ import annotations

from typing import Any

from clip_factory.domain.render import RenderSnapshot


def render_snapshot_payload(snapshot: RenderSnapshot) -> dict[str, Any]:
    """Temporal payload contains immutable metadata only, never a local path."""
    return snapshot.to_dict()
