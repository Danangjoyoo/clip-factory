import re
from typing import Any

SAFE = {
    "timestamp",
    "level",
    "event",
    "projectId",
    "workflowId",
    "activityId",
    "clipId",
    "renderId",
    "errorCode",
    "stage",
    "durationMs",
    "retryCount",
    "modelId",
    "tokenCount",
    "costMicrousd",
    "queueDelayMs",
}


def redact_diagnostic_record(record: dict[str, Any]) -> dict[str, Any]:
    def one(key: str, value: Any) -> Any:
        if key in SAFE and (
            value is None or isinstance(value, (str, int, float, bool))
        ):
            return value
        if re.search(
            r"secret|token|authorization|cookie|password|credential|apiKey", key, re.I
        ) or (isinstance(value, str) and re.search(r"(sk-[\w-]+|Bearer\s+\S+)", value)):
            return "[REDACTED_SECRET]"
        if re.search(r"path|filename|sourceLocator|resolved|candidate", key, re.I) or (
            isinstance(value, str)
            and re.search(r"(/Users/|file://|[A-Za-z]:\\)", value)
        ):
            return "[REDACTED_PATH]"
        if re.search(
            r"transcript|caption|prompt|response|message|word|text", key, re.I
        ) or isinstance(value, str):
            return "[REDACTED_TEXT]"
        if isinstance(value, list):
            return [one(key, item) for item in value]
        if isinstance(value, dict):
            return {k: one(k, v) for k, v in value.items()}
        return "[REDACTED_TEXT]"

    return {k: one(k, v) for k, v in record.items()}
