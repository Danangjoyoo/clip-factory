from clip_factory.entrypoints.temporal.activities.source_activities import (
    validate_local_source,
)
from clip_factory.application.validate_local_source import ValidateLocalSource
from typing import cast


def test_activity_returns_path_free_receipt() -> None:
    class Activity:
        def execute(self, source_asset_id):
            return {
                "source_asset_id": source_asset_id,
                "health": "LOCATED",
                "fingerprint": "f",
            }

    assert "/Users/" not in repr(validate_local_source(cast(ValidateLocalSource, Activity()), "source"))
