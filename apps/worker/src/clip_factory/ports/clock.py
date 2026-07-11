from typing import Protocol


class ClockPort(Protocol):
    def monotonic_ms(self) -> int: ...
