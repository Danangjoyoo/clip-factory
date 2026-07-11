from dataclasses import dataclass

@dataclass(frozen=True)
class Progress:
    completed_units: int
    total_units: int
    unit: str
    def __post_init__(self) -> None:
        if self.completed_units < 0 or self.total_units <= 0 or self.completed_units > self.total_units:
            raise ValueError('INVALID_WORK_UNITS')
