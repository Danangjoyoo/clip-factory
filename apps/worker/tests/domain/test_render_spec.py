from clip_factory.domain.render_spec import RenderSpec


def test_render_spec_is_immutable():
    spec = RenderSpec(
        "1.0.0",
        "r",
        "c",
        {"kind": "LOCAL_FILE"},
        (1080, 1920),
        (0, 1),
        (),
        (),
        {},
        None,
        {"strategy": "SOFTWARE"},
        "TIKTOK",
    )
    try:
        spec.title = "x"
    except Exception:
        pass
    else:
        raise AssertionError("RenderSpec must be frozen")
