from clip_factory.ports.analysis_child import AnalysisChildInput
from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.source_preprocessor import ObjectReference


def test_ai_project_factory_builds_paid_call_from_selected_analysis() -> None:
    value = AnalysisChildInput.from_project(
        WorkflowInput(
            "w",
            "p",
            "s",
            "AI_HIGHLIGHTS",
            "en",
            45,
            "gpt-5.6-sol",
            "high",
            321,
            3,
            "prefer hooks",
            10,
            90_000,
        ),
        ObjectReference("minio", "transcripts", "t", "etag"),
    )
    assert value.paid_call is not None
    assert value.paid_call.request.model == "gpt-5.6-sol"
    assert value.paid_call.request.reasoning == "high"
    assert value.paid_call.worst_case_microusd == 321
    assert value.paid_call.request.window == (10, 90_000)
