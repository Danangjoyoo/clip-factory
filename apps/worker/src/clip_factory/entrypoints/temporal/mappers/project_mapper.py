from typing import Any

from clip_factory.ports.project_results import WorkflowInput


def workflow_input_from_contract(payload: Any) -> WorkflowInput:
    return WorkflowInput(
        workflow_id=str(payload.workflowId),
        project_id=str(payload.projectId),
        source_asset_id=str(payload.sourceAssetId),
        mode=payload.mode.value,
        language_tag=payload.languageTag,
        max_clip_seconds=payload.maxClipSeconds,
        model_id=payload.analysis.modelId.value if payload.analysis else "gpt-5.5",
        reasoning=payload.analysis.reasoning.value if payload.analysis else "low",
        budget_microusd=payload.analysis.budgetMicrousd if payload.analysis else 10_000,
        maximum_clips=payload.analysis.maximumClips if payload.analysis else 1,
        instruction=payload.analysis.instruction or "" if payload.analysis else "",
        coverage_start_ms=payload.analysis.coverageStartMs if payload.analysis else 0,
        coverage_end_ms=payload.analysis.coverageEndMs if payload.analysis else 0,
    )
