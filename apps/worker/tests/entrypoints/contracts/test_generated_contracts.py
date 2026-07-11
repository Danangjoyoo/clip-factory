from clip_factory.entrypoints.contracts.generated.workflow_input import WorkflowInput


def test_generated_python_rejects_an_unknown_project_mode() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "workflowId": "00000000-0000-4000-8000-000000000001",
        "projectId": "00000000-0000-4000-8000-000000000002",
        "sourceAssetId": "00000000-0000-4000-8000-000000000003",
        "mode": "NO_AI",
        "languageTag": "en",
        "maxClipSeconds": 60,
        "platformPreset": "YOUTUBE_SHORTS",
        "analysis": None,
        "requestedAt": "2026-07-11T00:00:00Z",
    }
    try:
        WorkflowInput.model_validate(payload)
    except ValueError as error:
        assert "mode" in str(error)
    else:
        raise AssertionError("unknown mode was accepted")
