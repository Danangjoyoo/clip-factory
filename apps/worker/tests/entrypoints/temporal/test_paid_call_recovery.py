import asyncio
from datetime import timedelta

from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.temporal.activities.highlight_activities import (
    call_openai_once_activity,
    configure_paid_highlight_call,
    reconcile_paid_call_activity,
    reserve_paid_call_activity,
)
from clip_factory.entrypoints.temporal.child_workflows import PaidCallWorkflow
from clip_factory.ports.highlight_model import HighlightRequest, HighlightResponse
from clip_factory.ports.paid_call import PaidCallInput


class Deps:
    def __init__(self, callback: bool = False) -> None:
        self.callback = callback
        self.artifacts = {}
        self.calls = 0
        self.reservations = []
        self.sent = []
        self.completed = []

    async def reserve(self, request):
        self.reservations.append(request)
        return request

    async def mark_sent(self, call_id, request_hash):
        self.calls += 1
        self.sent.append((call_id, request_hash))

    async def put_json(self, key, value):
        self.artifacts[key] = value

    async def reconcile(self, _call_id, _request_hash):
        return None

    async def head_json(self, key):
        return key in self.artifacts

    async def get_json(self, key):
        return self.artifacts[key]

    async def record_paid_call(self, value):
        self.completed.append(value)
        if not self.callback:
            self.callback = True
            raise ConnectionError("callback acknowledgement lost")


class Model:
    def __init__(self, fail_once: bool = False) -> None:
        self.fail_once = fail_once
        self.calls = 0

    async def extract(self, _request):
        self.calls += 1
        if self.fail_once and self.calls == 1:
            raise TimeoutError("worker lost after SENT")
        return HighlightResponse((), "response-1", {})


def _input() -> PaidCallInput:
    return PaidCallInput("p", "a", HighlightRequest("text", "gpt-5.5", "low"), "call-1", 10)


def test_callback_loss_reconciles_without_second_provider_call() -> None:
    asyncio.run(_run_callback_loss())


async def _run_callback_loss() -> None:
    deps, model = Deps(), Model()
    deps.callback = False
    configure_paid_highlight_call(model, deps)
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(env.client, task_queue="paid-recovery-1", workflows=[PaidCallWorkflow], activities=[call_openai_once_activity, reserve_paid_call_activity, reconcile_paid_call_activity]):
            handle = await env.client.start_workflow(PaidCallWorkflow.run, _input(), id="paid-recovery-1", task_queue="paid-recovery-1")
            for _ in range(100):
                if await handle.query(PaidCallWorkflow.state) == "PAID_CALL_UNCERTAIN":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(PaidCallWorkflow.state) == "PAID_CALL_UNCERTAIN"
            await handle.signal(PaidCallWorkflow.retry_uncertain_paid_call, args=[True])
            result = await handle.result()
            assert result.response_id == "response-1"
            assert model.calls == 1
            original = _input()
            assert [(r.call_id, r.request_hash) for r in deps.reservations] == [("call-1", original.request_hash)]
            assert deps.sent == [("call-1", original.request_hash)]
            assert next(iter(deps.artifacts)) == "projects/p/analysis/a/calls/call-1.json"


def test_worker_loss_waits_for_acknowledgement_before_fresh_call() -> None:
    asyncio.run(_run_worker_loss())


async def _run_worker_loss() -> None:
    deps, model = Deps(callback=True), Model(fail_once=True)
    configure_paid_highlight_call(model, deps)
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(env.client, task_queue="paid-recovery-2", workflows=[PaidCallWorkflow], activities=[call_openai_once_activity, reserve_paid_call_activity, reconcile_paid_call_activity]):
            handle = await env.client.start_workflow(PaidCallWorkflow.run, _input(), id="paid-recovery-2", task_queue="paid-recovery-2")
            for _ in range(100):
                if await handle.query(PaidCallWorkflow.state) == "PAID_CALL_UNCERTAIN":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(PaidCallWorkflow.state) == "PAID_CALL_UNCERTAIN"
            assert model.calls == 1
            await handle.signal(PaidCallWorkflow.retry_uncertain_paid_call, args=[True])
            result = await handle.result()
            assert result.response_id == "response-1"
            assert model.calls == 2
            original = _input()
            assert deps.reservations[0].call_id == "call-1"
            assert deps.reservations[0].request_hash == original.request_hash
            assert deps.reservations[1].call_id != deps.reservations[0].call_id
            assert deps.reservations[1].request_hash != deps.reservations[0].request_hash
            assert deps.sent == [
                (deps.reservations[0].call_id, original.request_hash),
                (deps.reservations[1].call_id, deps.reservations[1].request_hash),
            ]
