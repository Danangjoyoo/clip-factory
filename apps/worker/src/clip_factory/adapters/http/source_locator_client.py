"""Small authenticated HTTP client; callers inject transport in tests."""

import json
from datetime import datetime, timezone
from typing import Any, Callable, cast
from urllib.request import Request, urlopen

from clip_factory.adapters.http.source_locator_client_models import (
    LocalFileLocator,
    SourceValidationUpdate,
)


class HttpSourceLocatorClient:
    def __init__(
        self,
        base_url: str,
        token: str,
        transport: Callable[[Request], bytes] | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._transport = transport or self._fetch

    @staticmethod
    def _fetch(request: Request) -> bytes:
        with urlopen(request) as response:  # noqa: S310 - URL is configured by the service
            return cast(bytes, response.read())

    def _request(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        payload = None if body is None else json.dumps(body).encode()
        request = Request(
            f"{self._base_url}{path}",
            data=payload,
            method=method,
            headers={
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
                "Idempotency-Key": body.get("idempotencyKey", "") if body else "",
            },
        )
        return cast(dict[str, Any], json.loads(self._transport(request)))

    def get(self, source_asset_id: str) -> LocalFileLocator:
        value = self._request("GET", f"/api/internal/sources/{source_asset_id}")
        if value.get("kind") != "LOCAL_FILE" or not isinstance(
            value.get("candidatePath"), str
        ):
            raise ValueError("source is not a local file")
        return LocalFileLocator("LOCAL_FILE", value["candidatePath"])

    def apply_locator_validation(
        self, update: SourceValidationUpdate
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/api/internal/sources/{update.source_asset_id}/validate",
            {
                "sourceAssetId": update.source_asset_id,
                "kind": "LOCAL_FILE",
                "resolvedPath": update.resolved_path,
                "sizeBytes": str(update.size_bytes),
                "modifiedAt": update.modified_at,
                "fingerprint": update.fingerprint,
                "probe": update.probe,
                "idempotencyKey": update.fingerprint,
            },
        )


def modified_at(ns: int) -> str:
    return (
        datetime.fromtimestamp(ns / 1_000_000_000, timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
