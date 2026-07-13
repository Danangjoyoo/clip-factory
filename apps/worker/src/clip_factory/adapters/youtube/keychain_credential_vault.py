import asyncio
from typing import Protocol

from pydantic import SecretStr


SERVICE_NAME = "com.clip-factory.youtube.refresh-token"


class KeyringBackend(Protocol):
    def set_password(self, service_name: str, username: str, password: str) -> None:
        raise NotImplementedError

    def get_password(self, service_name: str, username: str) -> str | None:
        raise NotImplementedError

    def delete_password(self, service_name: str, username: str) -> None:
        raise NotImplementedError


class MacOSKeychainCredentialVault:
    def __init__(self, backend: KeyringBackend) -> None:
        self._backend = backend

    async def replace_refresh_token(self, connection_id: str, token: SecretStr) -> None:
        await asyncio.to_thread(
            self._backend.set_password,
            SERVICE_NAME,
            connection_id,
            token.get_secret_value(),
        )

    async def read_refresh_token(self, connection_id: str) -> SecretStr:
        value = await asyncio.to_thread(
            self._backend.get_password,
            SERVICE_NAME,
            connection_id,
        )
        if value is None:
            raise KeyError(f"no credential for connection {connection_id}")
        return SecretStr(value)

    async def contains(self, connection_id: str) -> bool:
        value = await asyncio.to_thread(
            self._backend.get_password,
            SERVICE_NAME,
            connection_id,
        )
        return value is not None

    async def delete(self, connection_id: str) -> None:
        try:
            await asyncio.to_thread(
                self._backend.delete_password,
                SERVICE_NAME,
                connection_id,
            )
        except Exception:
            remaining = await asyncio.to_thread(
                self._backend.get_password,
                SERVICE_NAME,
                connection_id,
            )
            if remaining is not None:
                raise


def require_macos_keychain_backend() -> KeyringBackend:
    import keyring

    backend = keyring.get_keyring()
    if backend.__class__.__module__ != "keyring.backends.macOS":
        raise RuntimeError(
            f"macOS Keychain backend required; refusing {backend.__class__.__module__}"
        )
    return backend
