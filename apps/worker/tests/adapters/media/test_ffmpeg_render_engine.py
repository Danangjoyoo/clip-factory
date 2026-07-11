import asyncio
from pathlib import Path

from clip_factory.adapters.media.ffmpeg_render_engine import FfmpegRenderEngine
from clip_factory.domain.render_spec import RenderSpec


class Runner:
    def __init__(self) -> None:
        self.argv = None

    async def run(self, argv, on_stdout_line=None):
        self.argv = list(argv)
        return 0, "", ""


def test_render_uses_argv_and_quality_profile(tmp_path: Path) -> None:
    runner = Runner()
    spec = RenderSpec("1.0.0", "r", "c", {}, (1080, 1920), (0, 1000), (), (), {}, None, {"strategy": "SOFTWARE"}, "TIKTOK")
    asyncio.run(FfmpegRenderEngine(runner).render(spec, tmp_path / "in.mp4", tmp_path / "a.ass", tmp_path / "out.mp4"))
    assert runner.argv is not None and "libx264" in runner.argv and "-preset" in runner.argv
    assert "192k" in runner.argv and "-map" in runner.argv
