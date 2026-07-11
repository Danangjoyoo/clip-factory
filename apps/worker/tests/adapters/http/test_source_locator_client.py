import json
from typing import cast
from urllib.request import Request

from clip_factory.adapters.http.source_locator_client import HttpSourceLocatorClient
from clip_factory.adapters.http.source_locator_client_models import (
    SourceValidationUpdate,
)


def test_internal_validation_request_is_only_place_with_raw_path() -> None:
    requests: list[Request] = []

    def transport(request: Request) -> bytes:
        requests.append(request)
        return json.dumps(
            {"kind": "LOCAL_FILE", "candidatePath": "/Users/me/a.mov", "probe": {}}
        ).encode()

    client = HttpSourceLocatorClient("http://web", "token", transport)
    client.get("id")
    client.apply_locator_validation(
        SourceValidationUpdate(
            "id", "/Users/me/a.mov", 1, "2020-01-01T00:00:00Z", "a" * 64
        )
    )
    assert "/Users/me/a.mov" not in requests[0].full_url
    payload = cast(bytes, requests[1].data)
    assert payload is not None
    assert "/Users/me/a.mov" in payload.decode()
