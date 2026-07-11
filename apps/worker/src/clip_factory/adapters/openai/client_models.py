from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ClientUsage:
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    reasoning_tokens: int = 0


@dataclass(frozen=True)
class ClientResponse:
    response_id: str
    output: dict[str, Any]
    usage: ClientUsage
