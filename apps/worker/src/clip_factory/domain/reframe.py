"""Deterministic, fixed-point values used by vertical reframing."""

from dataclasses import dataclass

MICROS = 1_000_000


def _unit(value: int) -> int:
    return max(0, min(MICROS, value))


@dataclass(frozen=True)
class SubjectObservation:
    time_ms: int
    center_x_micros: int
    center_y_micros: int
    confidence_micros: int
    speaking_micros: int = 0
    area_micros: int = 0
    center_proximity_micros: int = 0
    subject_id: str | None = None

    def __post_init__(self) -> None:
        if self.time_ms < 0:
            raise ValueError("time must be non-negative")
        for name in (
            "center_x_micros",
            "center_y_micros",
            "confidence_micros",
            "speaking_micros",
            "area_micros",
            "center_proximity_micros",
        ):
            value = getattr(self, name)
            if not 0 <= value <= MICROS:
                raise ValueError(f"{name} outside fixed-point range")


@dataclass(frozen=True)
class CropPoint:
    time_ms: int
    center_x_micros: int
    center_y_micros: int
    confidence_micros: int
    source: str


def lerp(previous: int, target: int, alpha_micros: int) -> int:
    if not 0 <= alpha_micros <= MICROS:
        raise ValueError("alpha outside fixed-point range")
    return _unit(previous + ((target - previous) * alpha_micros) // MICROS)


def build_crop_track(
    observations: tuple[SubjectObservation, ...] | list[SubjectObservation],
    alpha_micros: int = 250_000,
    confidence_floor: int = 500_000,
) -> tuple[CropPoint, ...]:
    if not 0 <= confidence_floor <= MICROS:
        raise ValueError("confidence floor outside fixed-point range")
    points: list[CropPoint] = []
    x = y = MICROS // 2
    last_time = -1
    for item in observations:
        if item.time_ms < last_time:
            raise ValueError("observations must be monotonic")
        last_time = item.time_ms
        confident = item.confidence_micros >= confidence_floor
        target_x = item.center_x_micros if confident else MICROS // 2
        target_y = item.center_y_micros if confident else MICROS // 2
        x = target_x if not points else lerp(x, target_x, alpha_micros)
        y = target_y if not points else lerp(y, target_y, alpha_micros)
        points.append(
            CropPoint(
                item.time_ms,
                x,
                y,
                item.confidence_micros,
                "SUBJECT_TRACK" if confident else "CENTER_FALLBACK",
            )
        )
    return tuple(points)


def apply_manual_focal_point(
    track: tuple[CropPoint, ...], x_micros: int, y_micros: int
) -> tuple[CropPoint, ...]:
    if not 0 <= x_micros <= MICROS or not 0 <= y_micros <= MICROS:
        raise ValueError("focal point outside fixed-point range")
    return tuple(
        CropPoint(point.time_ms, x_micros, y_micros, MICROS, "MANUAL_FOCAL_POINT")
        for point in track
    )
