from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Mapping

from clip_factory.domain.render_spec import RenderSpec

_COLOR = re.compile(r"^#[0-9a-fA-F]{8}$")


def _value(value: Any, key: str, default: Any = None) -> Any:
    if isinstance(value, Mapping):
        return value.get(key, default)
    return getattr(value, key, default)


def ass_color(value: str) -> str:
    if not _COLOR.fullmatch(value):
        raise ValueError("INVALID_COLOR")
    red, green, blue, alpha = value[1:3], value[3:5], value[5:7], value[7:9]
    return f"&H{alpha}{blue}{green}{red}".upper()


def _timestamp(milliseconds: int) -> str:
    centiseconds = round(milliseconds / 10)
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    seconds, hundredths = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{seconds:02d}.{hundredths:02d}"


def _escape(text: str) -> str:
    return text.replace("\\", r"\\").replace("{", r"\{").replace("}", r"\}").replace("\n", r"\N")


def _font_catalog(font_directory: Path | None) -> set[str]:
    if font_directory is None:
        return {"Inter", "Arial", "Helvetica Neue"}
    names = {item.stem for item in font_directory.glob("*") if item.is_file()}
    return names | {"Inter", "Arial", "Helvetica Neue"}


def compile_ass(spec: RenderSpec, font_directory: Path | None = None) -> str:
    style = spec.style
    font = str(_value(style, "fontFamily", "Inter"))
    if font not in _font_catalog(font_directory):
        raise ValueError("FONT_NOT_ALLOWED")
    font_size = int(_value(style, "fontSizePx", 64))
    text_color = ass_color(str(_value(style, "textColor", "#FFFFFFFF")))
    outline_color = ass_color(str(_value(style, "outlineColor", "#000000FF")))
    background_color = ass_color(str(_value(style, "backgroundColor", "#00000000")))
    active_color = ass_color(str(_value(style, "activeWordColor", "#FFFFFFFF")))
    max_words = int(_value(style, "maxWordsPerLine", 8))
    position = int(round(int(_value(style, "verticalPositionMicros", 500_000)) / 1_000_000 * 1920))
    position = max(0, min(1920, position))
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font},{font_size},{text_color},{active_color},{outline_color},{background_color},0,0,0,0,100,100,0,0,1,3,0,2,64,64,64,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for cue in spec.captions:
        words = list(_value(cue, "words", ()))
        chunks = [words[index : index + max_words] for index in range(0, len(words), max_words)]
        if not chunks:
            chunks = [[cue]]
        for chunk in chunks:
            start = int(_value(chunk[0], "startMs", _value(cue, "startMs", 0)))
            end = int(_value(chunk[-1], "endMs", _value(cue, "endMs", start)))
            text: list[str] = []
            for word in chunk:
                word_start = int(_value(word, "startMs", start))
                word_end = int(_value(word, "endMs", end))
                duration = max(1, round((word_end - word_start) / 10))
                text.append(f"{{\\k{duration}}}{_escape(str(_value(word, 'text', '')))}")
            content = " ".join(text)
            content = f"{{\\c{active_color}}}{content}{{\\c{ass_color(str(_value(style, 'textColor', '#FFFFFFFF')))}}}"
            lines.append(f"Dialogue: 0,{_timestamp(start)},{_timestamp(end)},Default,,0,0,{position},,{content}")
    return "\n".join(lines) + "\n"
