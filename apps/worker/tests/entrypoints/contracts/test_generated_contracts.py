import json
from pathlib import Path

from clip_factory.entrypoints.contracts.generated.workflow_input import WorkflowInput
from clip_factory.entrypoints.contracts.generated.cost_data import CostData


def test_generated_python_rejects_the_shared_reasoning_fixture() -> None:
    fixture = (
        Path(__file__).parents[5]
        / "packages/contracts/test-fixtures/invalid-reasoning-workflow.json"
    )
    try:
        WorkflowInput.model_validate(json.loads(fixture.read_text()))
    except ValueError as error:
        assert "reasoning" in str(error)
    else:
        raise AssertionError("unsupported reasoning was accepted")


def test_generated_cost_data_rejects_unsupported_reasoning() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "analysisRunId": "00000000-0000-4000-8000-000000000001",
        "modelId": "gpt-5.5",
        "reasoning": "max",
        "pricingVersion": "openai-2026-07-11.1",
        "budgetMicrousd": 1,
        "reservedMicrousd": 1,
        "spentMicrousd": 0,
        "calls": [],
    }
    try:
        CostData.model_validate(payload)
    except ValueError as error:
        assert "reasoning" in str(error)
    else:
        raise AssertionError("unsupported cost reasoning was accepted")


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
