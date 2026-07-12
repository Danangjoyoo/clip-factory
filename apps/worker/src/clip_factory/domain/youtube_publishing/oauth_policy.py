from collections.abc import Callable, Iterable
from datetime import datetime
import base64
import hashlib
import hmac


REQUIRED_YOUTUBE_SCOPES = (
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
)


class OAuthSecurityError(ValueError):
    pass


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def create_pkce(random_bytes: Callable[[int], bytes]) -> tuple[str, str]:
    verifier = _base64url(random_bytes(64))
    if not 43 <= len(verifier) <= 128:
        raise OAuthSecurityError("PKCE verifier length is invalid")
    return verifier, _base64url(hashlib.sha256(verifier.encode("ascii")).digest())


def create_state(random_bytes: Callable[[int], bytes]) -> str:
    return _base64url(random_bytes(32))


def hash_state(state: str) -> str:
    return hashlib.sha256(state.encode("ascii")).hexdigest()


def validate_scopes(granted: Iterable[str]) -> tuple[str, ...]:
    granted_set = set(granted)
    required_set = set(REQUIRED_YOUTUBE_SCOPES)
    missing = required_set - granted_set
    if missing:
        raise OAuthSecurityError(f"missing required scopes: {sorted(missing)}")
    unexpected = granted_set - required_set
    if unexpected:
        raise OAuthSecurityError(f"unexpected OAuth scopes: {sorted(unexpected)}")
    return REQUIRED_YOUTUBE_SCOPES


def validate_callback(
    *,
    host: str,
    path: str,
    supplied_state: str,
    expected_state: str,
    now: datetime,
    expires_at: datetime,
) -> None:
    if host != "127.0.0.1" or path != "/oauth2/callback":
        raise OAuthSecurityError("unexpected OAuth callback target")
    if now >= expires_at:
        raise OAuthSecurityError("authorization flow expired")
    if not hmac.compare_digest(supplied_state, expected_state):
        raise OAuthSecurityError("OAuth state mismatch")
