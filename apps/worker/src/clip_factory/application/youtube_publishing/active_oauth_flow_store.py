from clip_factory.ports.youtube_publishing.runtime import ActiveOAuthFlow, ActiveOAuthFlowStore


class InMemoryActiveOAuthFlowStore(ActiveOAuthFlowStore):
    """Process-only OAuth proof store; never serialize this data."""

    def __init__(self) -> None:
        self._flows: dict[str, ActiveOAuthFlow] = {}

    def put(self, state_digest: str, flow: ActiveOAuthFlow) -> None:
        self._flows[state_digest] = flow

    def pop(self, state_digest: str) -> ActiveOAuthFlow | None:
        return self._flows.pop(state_digest, None)
