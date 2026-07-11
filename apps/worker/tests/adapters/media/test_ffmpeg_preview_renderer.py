import asyncio
from pathlib import Path

from clip_factory.adapters.media.ffmpeg_preview_renderer import FfmpegPreviewRenderer
from clip_factory.adapters.media.ffmpeg_render_spec_compiler import (
    FfmpegRenderSpecCompiler,
)
from clip_factory.domain.render_spec import RenderSpec


class Runner:
    def __init__(self):
        self.argv = None

    async def run(self, argv, callback=None):
        self.argv = list(argv)
        if callback:
            await callback("out_time_ms=1000")
        return 0, "", ""


def test_preview_argv_is_list_and_contains_vertical_profile(tmp_path: Path):
    runner, renderer = (
        Runner(),
        FfmpegPreviewRenderer(Runner(), FfmpegRenderSpecCompiler()),
    )
    renderer._runner = runner
    spec = RenderSpec(
        "1.0.0",
        "r",
        "c",
        {"kind": "LOCAL_FILE"},
        (1080, 1920),
        (100, 900),
        (),
        (),
        {},
        None,
        {},
        "TIKTOK",
    )
    asyncio.run(renderer.render(spec, tmp_path / "preview.mp4"))
    assert runner.argv is not None and "libx264" in runner.argv
    assert any("360:640" in str(argument) for argument in runner.argv)
