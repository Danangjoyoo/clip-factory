from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.render_spec_compiler import (
    CompiledRenderSpec,
    RenderProfile,
)


class FfmpegRenderSpecCompiler:
    def compile(self, spec: RenderSpec, profile: RenderProfile) -> CompiledRenderSpec:
        start, end = spec.range_ms
        filters = [
            "scale=360:640:force_original_aspect_ratio=decrease",
            "pad=360:640:(ow-iw)/2:(oh-ih)/2",
        ]
        crop = _crop_expression(spec)
        if crop:
            filters.insert(0, crop)
        subtitle = spec.style.get("subtitle_file")
        if subtitle:
            filters.append(f"ass={_escape(str(subtitle))}")
        if profile == "thumbnail":
            return CompiledRenderSpec(tuple(filters), ("-frames:v", "1", "-q:v", "2"))
        return CompiledRenderSpec(
            tuple(filters),
            (
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "28",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
            ),
        )


def _crop_expression(spec: RenderSpec) -> str:
    if not spec.crop_track:
        return ""
    # The crop track is immutable data; the renderer interpolates between points.
    point = spec.crop_track[0]
    x = point.get("centerXMicros", point.get("center_x_micros", 500_000))
    return f"crop=ih*9/16:ih:{_center(x)}:0"


def _center(value: object) -> str:
    if not isinstance(value, (int, float, str)):
        return "(iw-ih*9/16)*0.5"
    try:
        return f"(iw-ih*9/16)*{float(value) / 1_000_000:.6f}"
    except (TypeError, ValueError):
        return "(iw-ih*9/16)*0.5"


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:")
