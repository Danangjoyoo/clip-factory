from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime: ...


class EntropySource(Protocol):
    def bytes(self, size: int) -> bytes: ...


class LoopbackListener(Protocol):
    async def bind(self) -> str: ...

    async def wait_for_callback(self) -> "LoopbackOAuthCallback": ...


@dataclass(frozen=True, slots=True)
class LoopbackOAuthCallback:
    code: str
    state: str


@dataclass(frozen=True, slots=True)
class ActiveOAuthFlow:
    connection_id: str
    state: str
    code_verifier: str
    redirect_uri: str
    expires_at: datetime


class ActiveOAuthFlowStore(Protocol):
    def put(self, state_digest: str, flow: ActiveOAuthFlow) -> None: ...

    def pop(self, state_digest: str) -> ActiveOAuthFlow | None: ...
