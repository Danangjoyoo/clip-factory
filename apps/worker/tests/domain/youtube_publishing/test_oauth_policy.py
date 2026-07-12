from datetime import UTC, datetime, timedelta
import re

import pytest

from clip_factory.domain.youtube_publishing.oauth_policy import (
    REQUIRED_YOUTUBE_SCOPES,
    OAuthSecurityError,
    create_pkce,
    create_state,
    hash_state,
    validate_loopback_redirect_uri,
    validate_callback,
    validate_scopes,
)


def test_pkce_uses_s256_and_valid_verifier_characters() -> None:
    verifier, challenge = create_pkce(lambda size: bytes(range(size)))
    assert 43 <= len(verifier) <= 128
    assert re.fullmatch(r"[A-Za-z0-9._~-]+", verifier)
    assert challenge == "wsNdZaf3VpLTsEDmR5gPk2C6xYVWxKb0xcaG3O6kX10"
    assert "=" not in challenge


def test_pkce_rejects_short_verifier() -> None:
    with pytest.raises(OAuthSecurityError, match="PKCE verifier length is invalid"):
        create_pkce(lambda _: b"x")


def test_state_is_high_entropy_and_only_digest_is_persisted() -> None:
    state = create_state(lambda size: b"a" * size)
    assert len(state) >= 43
    assert hash_state(state) == hash_state(state)
    assert state not in hash_state(state)


def test_callback_requires_exact_target_state_and_unexpired_flow() -> None:
    now = datetime(2026, 7, 11, tzinfo=UTC)
    expires_at = now + timedelta(minutes=10)
    validate_callback(
        host="127.0.0.1",
        path="/oauth2/callback",
        supplied_state="state-1",
        expected_state="state-1",
        now=now,
        expires_at=expires_at,
    )
    for field, value in (
        ("host", "localhost"),
        ("path", "/wrong"),
        ("supplied_state", "state-2"),
    ):
        arguments = {
            "host": "127.0.0.1",
            "path": "/oauth2/callback",
            "supplied_state": "state-1",
            "expected_state": "state-1",
            "now": now,
            "expires_at": expires_at,
        }
        arguments[field] = value
        with pytest.raises(OAuthSecurityError):
            validate_callback(**arguments)
    with pytest.raises(OAuthSecurityError, match="authorization flow expired"):
        validate_callback(
            host="127.0.0.1",
            path="/oauth2/callback",
            supplied_state="state-1",
            expected_state="state-1",
            now=expires_at,
            expires_at=expires_at,
        )


@pytest.mark.parametrize(
    "redirect_uri",
    (
        "http://localhost:49152/oauth2/callback",
        "https://127.0.0.1:49152/oauth2/callback",
        "http://127.0.0.1:49152/wrong",
        "http://127.0.0.1:not-a-port/oauth2/callback",
        "http://127.0.0.1:0/oauth2/callback",
        "http://example.com:49152/oauth2/callback",
        "http://127.0.0.1/oauth2/callback",
    ),
)
def test_loopback_redirect_uri_requires_exact_bound_callback(redirect_uri: str) -> None:
    with pytest.raises(OAuthSecurityError, match="unexpected OAuth callback target"):
        validate_loopback_redirect_uri(redirect_uri)


def test_loopback_redirect_uri_accepts_bound_ipv4_callback() -> None:
    validate_loopback_redirect_uri("http://127.0.0.1:49152/oauth2/callback")


def test_scope_validation_requires_exact_capabilities_without_extra_scope() -> None:
    assert validate_scopes(REQUIRED_YOUTUBE_SCOPES) == REQUIRED_YOUTUBE_SCOPES
    with pytest.raises(OAuthSecurityError, match="missing required scopes"):
        validate_scopes((REQUIRED_YOUTUBE_SCOPES[0],))
    with pytest.raises(OAuthSecurityError, match="unexpected OAuth scopes"):
        validate_scopes(
            (
                *REQUIRED_YOUTUBE_SCOPES,
                "https://www.googleapis.com/auth/youtube.force-ssl",
            )
        )
