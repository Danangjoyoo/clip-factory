from clip_factory.application.project_pipeline import ProjectPipeline
from clip_factory.domain.job_state import JobState


def test_pipeline_uses_domain_transition_table() -> None:
    pipeline = ProjectPipeline()
    assert pipeline.advance("validate") is JobState.VALIDATING_SOURCE
