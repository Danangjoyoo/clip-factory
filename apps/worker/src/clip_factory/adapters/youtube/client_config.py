from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

from pydantic import SecretStr


@dataclass(frozen=True, slots=True)
class DesktopClientConfig:
    client_id: str
    client_secret: SecretStr
    authorization_endpoint: str
    token_endpoint: str


def load_desktop_client_config(path: Path) -> DesktopClientConfig:
    resolved = path.expanduser().resolve()
    try:
        status = resolved.stat()
    except OSError as error:
        raise ValueError("client config must be a Desktop client file with mode 0600") from error

    if not resolved.is_file() or status.st_mode & 0o077:
        raise ValueError("client config must be a Desktop client file with mode 0600")

    try:
        payload = json.loads(resolved.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("client config must be a Desktop client file with mode 0600") from error

    installed = payload.get("installed") if isinstance(payload, dict) else None
    if not isinstance(installed, dict):
        raise ValueError("client config must be a Desktop client file with mode 0600")

    return DesktopClientConfig(
        client_id=_required_string(installed, "client_id"),
        client_secret=SecretStr(_required_string(installed, "client_secret")),
        authorization_endpoint=_required_string(installed, "auth_uri"),
        token_endpoint=_required_string(installed, "token_uri"),
    )


def _required_string(values: dict[str, Any], key: str) -> str:
    value = values.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError("client config must be a Desktop client file with mode 0600")
    return value
