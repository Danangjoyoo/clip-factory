from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.render_spec_compiler import (
    CompiledRenderSpec,
    RenderProfile,
)


class FfmpegRenderSpecCompiler:
    """Compile the immutable render model; paths are deliberately not included."""

    def compile(self, spec: RenderSpec, profile: RenderProfile) -> CompiledRenderSpec:
        start, end = spec.range_ms
        crop = _crop(spec)
        filters = (
            f"{crop},scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2",
        )
        if profile is RenderProfile.PREVIEW:
            encoders = (
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
            )
        elif profile is RenderProfile.THUMBNAIL:
            encoders = ("-frames:v", "1", "-q:v", "2")
        else:
            encoders = ("-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac")
        return CompiledRenderSpec(
            filters=filters + (f"trim=start={start / 1000}:end={end / 1000}",),
            encoders=encoders,
        )


def _crop(spec: RenderSpec) -> str:
    if not spec.crop_track:
        return "crop=ih*9/16:ih"
    point = spec.crop_track[0]
    x = float(point.get("centerXMicros", 500_000)) / 1_000_000
    return f"crop=ih*9/16:ih:(iw-ih*9/16)*{x:.6f}:0"
