from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class TokenizationResult:
    total_input: int
    cached_input: int
    cache_write_input: int
    output: int
    encoding: str
    version: str


class TokenizerPort(Protocol):
    def count(
        self, prompt: str, transcript: str, output_tokens: int = 0
    ) -> TokenizationResult: ...
