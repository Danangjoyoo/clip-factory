from datetime import datetime, timezone


def aggregate_health(components: list[dict[str, object]]) -> dict[str, object]:
    status = (
        "HEALTHY"
        if all(c.get("status") == "HEALTHY" for c in components)
        else "DEGRADED"
    )
    return {
        "status": status,
        "components": [
            dict(c, checkedAt=datetime.now(timezone.utc).isoformat())
            for c in components
        ],
    }
