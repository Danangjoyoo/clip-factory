from dataclasses import dataclass
from enum import StrEnum


class ErrorClass(StrEnum):
    TRANSIENT = "TRANSIENT"
    NON_RETRYABLE = "NON_RETRYABLE"
    OUTCOME_UNCERTAIN = "OUTCOME_UNCERTAIN"


@dataclass(frozen=True)
class RetryDecision:
    retryable: bool
    max_attempts: int = 5
    initial_ms: int = 1000
    maximum_ms: int = 30000
    non_retryable_types: frozenset[str] = frozenset()

    def delay_ms(self, attempt: int, jitter_micros: int = 1_000_000) -> int:
        base = min(self.initial_ms * (2 ** max(0, attempt - 1)), self.maximum_ms)
        return (base * jitter_micros) // 1_000_000


def classify_error(error_type: str) -> ErrorClass:
    if error_type == "OPENAI_OUTCOME_UNCERTAIN":
        return ErrorClass.OUTCOME_UNCERTAIN
    transient = ("MINIO", "REDIS", "TEMPORAL", "HTTP", "PROCESS_IO")
    return ErrorClass.TRANSIENT if error_type.startswith(transient) else ErrorClass.NON_RETRYABLE


def decision_for(error_type: str) -> RetryDecision:
    return RetryDecision(retryable=classify_error(error_type) is ErrorClass.TRANSIENT)
