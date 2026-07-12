from pydantic import ValidationError
import pytest

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
)


SCOPES = (
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
)


def test_oauth_contract_forbids_token_material() -> None:
    with pytest.raises(ValidationError):
        OAuthConnectionWorkflowInputV1.model_validate(
            {
                'contractVersion': 1,
                'connectionId': '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
                'requestedScopes': SCOPES,
                'refreshToken': 'sentinel-secret',
            }
        )


def test_oauth_contract_accepts_only_required_scopes() -> None:
    payload = OAuthConnectionWorkflowInputV1.model_validate(
        {
            'contractVersion': 1,
            'connectionId': '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
            'requestedScopes': SCOPES,
        }
    )
    assert tuple(payload.requestedScopes.root) == SCOPES


def test_oauth_contract_rejects_noncanonical_scopes() -> None:
    with pytest.raises(ValidationError):
        OAuthConnectionWorkflowInputV1.model_validate(
            {
                'contractVersion': 1,
                'connectionId': '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
                'requestedScopes': tuple(reversed(SCOPES)),
            }
        )
