from clip_factory.entrypoints.temporal.progress_heartbeat import progress_reporter

def test_report_heartbeats_contract() -> None:
    class Activity:
        def __init__(self) -> None: self.values: list[dict[str, object]] = []
        def heartbeat(self, value: dict[str, object]) -> None: self.values.append(value)
    activity = Activity()
    progress_reporter(activity).report(2, 4, 'ITEMS')
    assert activity.values == [{'completedUnits': 2, 'totalUnits': 4, 'unit': 'ITEMS'}]


def test_report_validates_identity_timestamp_and_redacts_payload() -> None:
    class Activity:
        def __init__(self) -> None: self.values: list[dict[str, object]] = []
        def heartbeat(self, value: dict[str, object]) -> None: self.values.append(value)

    activity = Activity()
    progress_reporter(activity).report(
        1,
        2,
        'ITEMS',
        project_id='00000000-0000-4000-8000-000000000000',
        workflow_id='00000000-0000-4000-8000-000000000001',
        stage='TRANSCRIBING',
        occurred_at='2026-07-11T00:00:00Z',
    )
    assert activity.values[0] == {
        'completedUnits': 1,
        'totalUnits': 2,
        'unit': 'ITEMS',
        'projectId': '00000000-0000-4000-8000-000000000000',
        'workflowId': '00000000-0000-4000-8000-000000000001',
        'stage': 'TRANSCRIBING',
        'occurredAt': '2026-07-11T00:00:00+00:00',
    }
    assert 'path' not in activity.values[0] and 'transcript' not in activity.values[0]
