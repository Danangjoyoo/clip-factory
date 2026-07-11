from typing import Protocol
from clip_factory.domain.progress import Progress

class ProgressReporter(Protocol):
    def report(self, completed: int, total: int, unit: str) -> None: ...

class ActivityProgressReporter:
    def __init__(self, activity: object) -> None:
        self._activity = activity
    def report(self, completed: int, total: int, unit: str) -> None:
        progress = Progress(completed, total, unit)
        heartbeat = getattr(self._activity, 'heartbeat')
        heartbeat({'completedUnits': progress.completed_units, 'totalUnits': progress.total_units, 'unit': progress.unit})
