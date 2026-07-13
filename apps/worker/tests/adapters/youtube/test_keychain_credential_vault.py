import asyncio

import pytest
from pydantic import SecretStr

from clip_factory.adapters.youtube.keychain_credential_vault import (
    MacOSKeychainCredentialVault,
)


class FakeKeyringBackend:
    def __init__(self) -> None:
        self.values: dict[tuple[str, str], str] = {}

    def set_password(self, service_name: str, username: str, password: str) -> None:
        self.values[(service_name, username)] = password

    def get_password(self, service_name: str, username: str) -> str | None:
        return self.values.get((service_name, username))

    def delete_password(self, service_name: str, username: str) -> None:
        self.values.pop((service_name, username), None)


class RetainingDeleteFailureBackend(FakeKeyringBackend):
    def delete_password(self, service_name: str, username: str) -> None:
        raise RuntimeError("delete failed")


def test_keychain_round_trip_is_scoped_by_opaque_connection_id() -> None:
    fake_keyring = FakeKeyringBackend()
    first = MacOSKeychainCredentialVault(fake_keyring)
    asyncio.run(first.replace_refresh_token("connection-1", SecretStr("sentinel-refresh")))

    restarted = MacOSKeychainCredentialVault(fake_keyring)

    assert (
        asyncio.run(restarted.read_refresh_token("connection-1"))
    ).get_secret_value() == "sentinel-refresh"
    assert asyncio.run(restarted.contains("connection-1")) is True
    asyncio.run(restarted.delete("connection-1"))
    assert asyncio.run(restarted.contains("connection-1")) is False


def test_secret_values_are_absent_from_repr_and_logs(caplog: pytest.LogCaptureFixture) -> None:
    vault = MacOSKeychainCredentialVault(FakeKeyringBackend())
    token = SecretStr("sentinel-refresh-token")

    assert "sentinel-refresh-token" not in repr(token)
    assert "sentinel-refresh-token" not in repr(vault)
    assert "sentinel-refresh-token" not in caplog.text


def test_delete_reraises_when_backend_retains_the_credential() -> None:
    backend = RetainingDeleteFailureBackend()
    vault = MacOSKeychainCredentialVault(backend)
    asyncio.run(vault.replace_refresh_token("connection-1", SecretStr("sentinel-refresh")))

    with pytest.raises(RuntimeError, match="delete failed"):
        asyncio.run(vault.delete("connection-1"))
