import asyncio

import pytest

from clip_factory.ports.highlight_model import HighlightRequest, HighlightResponse
from clip_factory.ports.paid_call import (
    OPENAI_PRE_SEND_FAILURE,
    PaidCallInput,
    call_openai_once,
)


class Model:
    async def extract(self, request):
        return HighlightResponse((), "resp-1", {"output_tokens": 1})


class Deps:
    def __init__(self):
        self.sent = []
        self.artifacts = {}

    async def reserve(self, request):
        return object()

    async def mark_sent(self, call_id, request_hash):
        self.sent.append((call_id, request_hash))

    async def put_json(self, key, value):
        self.artifacts[key] = value


def call():
    return PaidCallInput("p", "a", HighlightRequest("hello", "gpt-5.5", "low"), "c1", 10)


def test_paid_call_marks_exact_hash_and_persists_validated_response():
    deps = Deps()
    result = asyncio.run(call_openai_once(Model(), deps, call()))
    assert result.response_id == "resp-1"
    assert deps.sent == [("c1", call().request_hash)]
    artifact = next(iter(deps.artifacts.values()))
    assert artifact["validatedResponse"]["candidates"] == []


def test_missing_sent_transition_is_pre_send_failure():
    class NoSent:
        async def reserve(self, request):
            return object()

        async def put_json(self, key, value):
            raise AssertionError("provider must not be called")

    with pytest.raises(Exception) as raised:
        asyncio.run(call_openai_once(Model(), NoSent(), call()))
    assert getattr(raised.value, "error_type", None) == OPENAI_PRE_SEND_FAILURE
