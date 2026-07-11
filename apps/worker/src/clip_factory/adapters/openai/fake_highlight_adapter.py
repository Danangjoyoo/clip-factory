import json
from pathlib import Path

from clip_factory.adapters.openai.highlight_adapter import _candidate
from clip_factory.ports.highlight_model import HighlightRequest, HighlightResponse


class FakeHighlightAdapter:
    def __init__(self, fixture: str | Path | None = None) -> None:
        self._fixture = (
            Path(fixture)
            if fixture
            else Path(__file__).parents[6]
            / "tests"
            / "fixtures"
            / "highlights"
            / "fake-response.json"
        )
        self.calls: list[HighlightRequest] = []

    async def extract(self, request: HighlightRequest) -> HighlightResponse:
        self.calls.append(request)
        data = json.loads(self._fixture.read_text())
        return HighlightResponse(
            tuple(_candidate(item) for item in data.get("candidates", [])),
            "fake-response",
            {},
        )
