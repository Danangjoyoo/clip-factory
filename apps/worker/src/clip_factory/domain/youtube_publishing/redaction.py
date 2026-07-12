from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit, urlunsplit


def redact_google_event(event: Mapping[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    headers = event.get("headers")
    if isinstance(headers, Mapping):
        safe_headers = {"content-type", "retry-after", "x-request-id"}
        output["headers"] = {
            str(key): "[REDACTED]" if str(key).lower() == "authorization" else value
            for key, value in headers.items()
            if str(key).lower() == "authorization" or str(key).lower() in safe_headers
        }
    url = event.get("url")
    if isinstance(url, str):
        parsed = urlsplit(url)
        output["url"] = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    if "body" in event:
        output["body"] = "[REDACTED]"
    for key in ("method", "status", "request_id", "error_code"):
        if key in event:
            output[key] = event[key]
    return output
