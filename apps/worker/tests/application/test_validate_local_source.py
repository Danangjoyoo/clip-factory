from clip_factory.application.validate_local_source import ValidateLocalSource


def test_application_delegates_to_validation_port() -> None:
    class Gateway:
        def validate_and_persist(self, source_asset_id):
            return {"source_asset_id": source_asset_id}

    assert ValidateLocalSource(Gateway()).execute("source") == {
        "source_asset_id": "source"
    }
