from clip_factory.domain.retry import (
    ErrorClass,
    RetryDecision,
    classify_error,
    decision_for,
)


def test_retry_decision_caps_backoff_and_applies_jitter() -> None:
    decision = RetryDecision(retryable=True, initial_ms=100, maximum_ms=250)

    assert decision.delay_ms(1) == 100
    assert decision.delay_ms(4) == 250
    assert decision.delay_ms(3, jitter_micros=500_000) == 125


def test_error_classification_drives_retry_policy() -> None:
    assert classify_error("OPENAI_OUTCOME_UNCERTAIN") is ErrorClass.OUTCOME_UNCERTAIN
    assert classify_error("REDIS_TIMEOUT") is ErrorClass.TRANSIENT
    assert classify_error("VALIDATION_ERROR") is ErrorClass.NON_RETRYABLE

    assert decision_for("HTTP_503").retryable is True
    assert decision_for("BAD_REQUEST").retryable is False
