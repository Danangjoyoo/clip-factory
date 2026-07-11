from pathlib import Path
from typing import Any
import re


def _time(ms: int) -> str:
    total, remainder = divmod(max(0, ms), 1_000)
    centis = remainder // 10
    hours, rem = divmod(total, 3_600_000)
    minutes, seconds = divmod(rem, 60_000)
    return f"{hours}:{minutes // 60:02d}:{seconds:02d}.{centis:02d}"


def _color(value: str) -> str:
    value = value.removeprefix("#")
    if not re.fullmatch(r"[0-9a-fA-F]{8}", value):
        raise ValueError("INVALID_COLOR")
    r, g, b, a = (value[i : i + 2] for i in range(0, 8, 2))
    return f"&H{a}{b}{g}{r}&"


def compile_ass(spec: dict[str, Any], font_directory: Path) -> str:
    style = spec["style"]
    family = style["fontFamily"]
    if not any(
        path.stem.lower() == family.lower() for path in font_directory.glob("*")
    ):
        raise ValueError("FONT_NOT_FOUND")
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{family},{style['fontSizePx']},{_color(style['textColor'])},{_color(style['textColor'])},{_color(style['outlineColor'])},{_color(style['backgroundColor'])},0,0,0,0,100,100,0,0,1,2,0,5,40,40,40,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for cue in spec.get("captions", []):
        words = cue.get("words", [])
        rendered = []
        for i, word in enumerate(words):
            tag = f"\\k{max(1, round((word['endMs'] - word['startMs']) / 10))}"
            if i:
                tag += f"\\c{_color(style['activeWordColor'])}"
            value = (
                word["text"]
                .replace("\\", "\\\\")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace("\n", "\\N")
            )
            rendered.append(f"{{{tag}}}{value}")
        text = "".join(rendered)
        lines.append(
            f"Dialogue: 0,{_time(cue['startMs'])},{_time(cue['endMs'])},Default,,0,0,0,,{text}"
        )
    return "\n".join(lines) + "\n"
