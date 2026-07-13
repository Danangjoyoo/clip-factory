from pathlib import Path

import pytest

from clip_factory.adapters.youtube.client_config import load_desktop_client_config


def test_loads_mode_0600_desktop_config(tmp_path: Path) -> None:
    path = tmp_path / "google-client.json"
    path.write_text(
        '{"installed":{"client_id":"desktop-id","client_secret":"sentinel-client-config",'
        '"auth_uri":"https://accounts.google.com/o/oauth2/v2/auth",'
        '"token_uri":"https://oauth2.googleapis.com/token"}}',
        encoding="utf-8",
    )
    path.chmod(0o600)

    config = load_desktop_client_config(path)

    assert config.client_id == "desktop-id"
    assert config.authorization_endpoint == "https://accounts.google.com/o/oauth2/v2/auth"
    assert config.token_endpoint == "https://oauth2.googleapis.com/token"
    assert "sentinel-client-config" not in repr(config)


def test_rejects_group_readable_or_web_client_config(tmp_path: Path) -> None:
    path = tmp_path / "google-client.json"
    path.write_text('{"web":{"client_id":"wrong"}}', encoding="utf-8")
    path.chmod(0o644)

    with pytest.raises(
        ValueError, match="must be a Desktop client file with mode 0600"
    ):
        load_desktop_client_config(path)
