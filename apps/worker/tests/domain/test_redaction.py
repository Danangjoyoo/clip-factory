from clip_factory.domain.redaction import redact_diagnostic_record


def test_redacts_categories():
    result = redact_diagnostic_record(
        {
            "modelId": "gpt",
            "apiKey": "sk-proj-secret",
            "path": "/Users/me/a.mov",
            "transcript": "hello",
        }
    )
    assert result == {
        "modelId": "gpt",
        "apiKey": "[REDACTED_SECRET]",
        "path": "[REDACTED_PATH]",
        "transcript": "[REDACTED_TEXT]",
    }
