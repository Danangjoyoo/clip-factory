import asyncio

import pytest

from clip_factory.adapters.openai.highlight_adapter import OpenAIHighlightAdapter
from clip_factory.ports.highlight_model import HighlightRequest


class Responses:
    async def create(self, **_kwargs):
        class Response:
            output_text = '{"candidates":[{"startMs":1}]}'
            id = "r"
            usage = None

        return Response()


class Client:
    responses = Responses()


def test_adapter_rejects_malformed_structured_candidate():
    with pytest.raises((KeyError, ValueError)):
        asyncio.run(OpenAIHighlightAdapter(Client()).extract(HighlightRequest("x", "gpt-5.5", "low")))
