from typing import Any


def map_render_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in payload.items()
        if key not in {"path", "presigned_url"}
    }
