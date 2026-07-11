from clip_factory.adapters.media.ass_compiler import compile_ass


def test_compile_ass_emits_vertical_video_and_karaoke_cues(tmp_path):
    font = tmp_path / "Inter.ttf"
    font.touch()
    text = compile_ass(
        {
            "canvas": (1080, 1920),
            "style": {
                "fontFamily": "Inter",
                "fontSizePx": 64,
                "textColor": "#FFFFFFFF",
                "outlineColor": "#000000FF",
                "backgroundColor": "#00000080",
                "activeWordColor": "#FFCC00FF",
                "verticalPositionMicros": 500_000,
                "maxWordsPerLine": 6,
            },
            "captions": [
                {"startMs": 0, "endMs": 1250, "words": [
                    {"text": "hello", "startMs": 0, "endMs": 500},
                    {"text": "{world}", "startMs": 500, "endMs": 1250},
                ]}
            ],
        },
        tmp_path,
    )
    assert "PlayResX: 1080" in text and "PlayResY: 1920" in text
    assert "Style: Default,Inter,64" in text
    assert "Dialogue: 0,0:00:00.00,0:00:01.25" in text
    assert "{\\k50}hello" in text and "{\\k75\\c&HFF00CCFF&}" in text
