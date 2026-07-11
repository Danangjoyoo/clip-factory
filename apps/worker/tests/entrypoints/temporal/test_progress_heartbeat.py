from clip_factory.entrypoints.temporal.progress_heartbeat import progress_reporter

def test_report_heartbeats_contract() -> None:
    class Activity:
        def __init__(self) -> None: self.values: list[dict[str, object]] = []
        def heartbeat(self, value: dict[str, object]) -> None: self.values.append(value)
    activity = Activity()
    progress_reporter(activity).report(2, 4, 'ITEMS')
    assert activity.values == [{'completedUnits': 2, 'totalUnits': 4, 'unit': 'ITEMS'}]
