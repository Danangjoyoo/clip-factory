from clip_factory.entrypoints.temporal.activities.source_activities import (
    validate_local_source,
)


def test_activity_returns_path_free_receipt() -> None:
    class Activity:
        def execute(self, source_asset_id):
            return {
                "source_asset_id": source_asset_id,
                "health": "LOCATED",
                "fingerprint": "f",
            }

    assert "/Users/" not in repr(validate_local_source(Activity(), "source"))
