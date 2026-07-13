import asyncio
import os
from uuid import uuid4

import pytest
from pydantic import SecretStr

from clip_factory.adapters.youtube.keychain_credential_vault import (
    MacOSKeychainCredentialVault,
    require_macos_keychain_backend,
)


@pytest.mark.real_keychain
def test_real_keychain_vault_round_trip_requires_explicit_opt_in() -> None:
    if os.environ.get("CLIP_FACTORY_KEYCHAIN_TEST") != "1":
        pytest.skip("set CLIP_FACTORY_KEYCHAIN_TEST=1 to run real Keychain smoke")

    vault = MacOSKeychainCredentialVault(require_macos_keychain_backend())
    connection_id = f"clip-factory-keychain-smoke-{uuid4()}"
    token = SecretStr(f"inert-{uuid4()}")
    try:
        asyncio.run(vault.replace_refresh_token(connection_id, token))
        restarted = MacOSKeychainCredentialVault(require_macos_keychain_backend())
        assert (
            asyncio.run(restarted.read_refresh_token(connection_id)).get_secret_value()
            == token.get_secret_value()
        )
    finally:
        asyncio.run(vault.delete(connection_id))
