from clip_factory.adapters.media.ass_compiler import compile_ass
from clip_factory.domain.render_spec import RenderSpec


def spec() -> RenderSpec:
    return RenderSpec(
        "1.0.0", "r", "c", {"kind": "OBJECT"}, (1080, 1920), (0, 2_000), (),
        ({"startMs": 0, "endMs": 2_000, "words": ({"text": "hello {x}", "startMs": 0, "endMs": 500}, {"text": "world", "startMs": 500, "endMs": 2_000})},),
        {"fontFamily": "Inter", "fontSizePx": 64, "textColor": "#112233FF", "outlineColor": "#000000FF", "backgroundColor": "#00000000", "activeWordColor": "#FF0000FF", "maxWordsPerLine": 8, "verticalPositionMicros": 500_000}, None, {"strategy": "SOFTWARE"}, "TIKTOK",
    )


def test_ass_is_deterministic_and_uses_vertical_canvas() -> None:
    result = compile_ass(spec())
    assert "PlayResX: 1080" in result and "PlayResY: 1920" in result
    assert "Dialogue: 0,0:00:00.00,0:00:02.00" in result
    assert r"hello \{x\}" in result and r"{\k50}" in result
    assert "&HFF332211" in result
