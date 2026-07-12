from clip_factory.adapters.media.ffmpeg_render_spec_compiler import (
    FfmpegRenderSpecCompiler,
)
from clip_factory.domain.render_spec import RenderSpec


def test_compiler_adds_crop_subtitles_and_thumbnail_args() -> None:
    spec = _spec(
        crop_track=({"center_x_micros": "250000"},),
        style={"subtitle_file": "C:\\tmp\\captions.ass"},
    )

    compiled = FfmpegRenderSpecCompiler().compile(spec, "thumbnail")

    assert compiled.filter_args[0].startswith("crop=ih*9/16:ih:")
    assert "0.250000" in compiled.filter_args[0]
    assert compiled.filter_args[-1] == "ass=C\\:\\\\tmp\\\\captions.ass"
    assert compiled.encoder_args == ("-frames:v", "1", "-q:v", "2")


def test_compiler_uses_default_center_for_bad_crop_value() -> None:
    spec = _spec(crop_track=({"centerXMicros": object()},))

    compiled = FfmpegRenderSpecCompiler().compile(spec, "preview")

    assert compiled.filter_args[0] == "crop=ih*9/16:ih:(iw-ih*9/16)*0.5:0"
    assert "-movflags" in compiled.encoder_args


def _spec(**overrides: object) -> RenderSpec:
    values = {
        "schema_version": "1.0.0",
        "render_id": "r",
        "clip_id": "c",
        "source": {"kind": "LOCAL_FILE"},
        "canvas": (1080, 1920),
        "range_ms": (0, 1_000),
        "crop_track": (),
        "captions": (),
        "style": {},
        "title": None,
        "encoder": {"strategy": "SOFTWARE"},
        "platform_preset": "YOUTUBE_SHORTS",
        **overrides,
    }
    return RenderSpec(**values)  # type: ignore[arg-type]
