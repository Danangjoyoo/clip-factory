from clip_factory.application.health import aggregate_health


def test_health():
    assert (
        aggregate_health([{"component": "db", "status": "HEALTHY"}])["status"]
        == "HEALTHY"
    )
