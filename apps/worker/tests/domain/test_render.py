from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render import RenderOutputError, RenderSnapshot, artifact_key, validate_output
from clip_factory.domain.render_spec import RenderSpec


def test_snapshot_fingerprint_and_output_invariants() -> None:
    spec = RenderSpec("1.0.0", "r", "c", {}, (1080, 1920), (0, 1000), (), (), {}, None, {}, "TIKTOK")
    snap = RenderSnapshot(spec, "v1", "hash")
    assert snap.fingerprint() == RenderSnapshot(spec, "v1", "hash").fingerprint()
    assert artifact_key("p", "c", "r").endswith("r.mp4")
    validate_output(MediaProbe(1000, 1, "mp4", "h264", 1080, 1920, 30, 1, "aac", 48_000), 1000)
    try:
        validate_output(MediaProbe(1000, 1, "mp4", "h264", 1, 2, 30, 1, "aac", 48_000), 1000)
    except RenderOutputError as error:
        assert error.code == "RENDER_OUTPUT_INVALID"
    else:
        raise AssertionError("invalid output accepted")
