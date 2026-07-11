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
    )
