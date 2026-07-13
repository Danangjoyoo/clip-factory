import clip_factory.entrypoints.temporal.worker as worker_module


def test_worker_configures_runtime_concurrency(monkeypatch) -> None:
    captured = {}

    class FakeWorker:
        def __init__(self, _client, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(worker_module, "Worker", FakeWorker)
    worker_module.build_worker(object())
    assert captured["max_concurrent_activities"] == 1
    assert captured["max_concurrent_workflow_tasks"] == 20


def test_worker_registers_youtube_oauth_when_configured(monkeypatch, tmp_path) -> None:
    captured = {}
    client_config = tmp_path / "google-client.json"
    client_config.write_text(
        '{"installed":{"client_id":"desktop-id","client_secret":"sentinel-client-config"}}',
        encoding="utf-8",
    )
    client_config.chmod(0o600)

    class FakeWorker:
        def __init__(self, _client, **kwargs):
            captured.update(kwargs)

    class FakeOAuthActivities:
        async def authorize_or_resume_oauth_activity(self, payload):
            del payload

        async def deliver_oauth_result_activity(self, result):
            del result

    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "local-test-token")
    monkeypatch.setenv("YOUTUBE_OAUTH_CLIENT_CONFIG_PATH", str(client_config))
    monkeypatch.setattr(worker_module, "Worker", FakeWorker)
    monkeypatch.setattr(
        worker_module,
        "build_youtube_oauth_activities",
        lambda _settings: FakeOAuthActivities(),
        raising=False,
    )

    worker_module.build_worker(object())

    workflow_names = {workflow.__name__ for workflow in captured["workflows"]}
    activity_names = {activity.__name__ for activity in captured["activities"]}
    assert "YouTubeOAuthWorkflow" in workflow_names
    assert "authorize_or_resume_oauth_activity" in activity_names
    assert "deliver_oauth_result_activity" in activity_names
