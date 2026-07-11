from dataclasses import dataclass

from clip_factory.domain.job_state import JobState, transition


@dataclass
class ProjectPipeline:
    state: JobState = JobState.QUEUED

    def advance(self, event: str) -> JobState:
        self.state = transition(self.state, event)
        return self.state
