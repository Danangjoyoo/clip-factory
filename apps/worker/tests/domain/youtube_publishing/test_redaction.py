from clip_factory.domain.youtube_publishing.redaction import redact_google_event


def test_redacts_headers_queries_bodies_and_nested_credentials() -> None:
    event = {
        "headers": {"Authorization": "Bearer sentinel", "Content-Type": "application/json"},
        "url": "https://oauth2.googleapis.com/token?code=sentinel&state=sentinel",
        "body": {"refresh_token": "sentinel", "nested": {"accessToken": "sentinel"}},
        "status": 400,
    }
    assert redact_google_event(event) == {
        "headers": {"Authorization": "[REDACTED]", "Content-Type": "application/json"},
        "url": "https://oauth2.googleapis.com/token",
        "body": "[REDACTED]",
        "status": 400,
    }


def test_drops_cookie_set_cookie_unknown_headers_and_unknown_payloads() -> None:
    assert redact_google_event(
        {
            "headers": {
                "Cookie": "oauth=sentinel",
                "Set-Cookie": "refresh=sentinel",
                "X-Debug-Credential": "sentinel",
                "Retry-After": "30",
            },
            "status": 400,
            "oauth_payload": {"credential": "runtime-secret"},
        }
    ) == {"headers": {"Retry-After": "30"}, "status": 400}


def test_preserves_only_allowlisted_fields_without_headers() -> None:
    assert redact_google_event({"method": "POST", "error_code": "invalid_grant"}) == {
        "method": "POST",
        "error_code": "invalid_grant",
    }
