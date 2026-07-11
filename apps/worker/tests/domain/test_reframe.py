from clip_factory.domain.reframe import SubjectObservation, apply_manual_focal_point, build_crop_track


def observation(time_ms: int, x: int, confidence: int) -> SubjectObservation:
    return SubjectObservation(time_ms, x, 450_000, confidence)


def test_crop_track_smooths_jitter_and_falls_back_to_center() -> None:
    track = build_crop_track((observation(0, 400_000, 900_000), observation(100, 600_000, 900_000), observation(200, 900_000, 100_000)))
    assert [(p.time_ms, p.center_x_micros, p.source) for p in track] == [(0, 400_000, "SUBJECT_TRACK"), (100, 450_000, "SUBJECT_TRACK"), (200, 462_500, "CENTER_FALLBACK")]


def test_manual_override_preserves_times() -> None:
    track = apply_manual_focal_point(build_crop_track((observation(0, 400_000, 900_000),)), 250_000, 400_000)
    assert (track[0].center_x_micros, track[0].center_y_micros, track[0].source) == (250_000, 400_000, "MANUAL_FOCAL_POINT")
