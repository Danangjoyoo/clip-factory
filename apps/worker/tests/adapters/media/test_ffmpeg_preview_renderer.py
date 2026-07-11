import asyncio
from pathlib import Path

from clip_factory.adapters.media.ffmpeg_preview_renderer import FfmpegPreviewRenderer
from clip_factory.domain.render_spec import RenderSpec


class Runner:
    def __init__(self) -> None:
        self.argv = []

    async def run(self, argv, on_stdout_line=None):
        self.argv.append([str(item) for item in argv])
        return 0, "out_time_ms=500\n", ""


def test_renderer_uses_shared_profile_and_clip_range(tmp_path: Path) -> None:
    runner = Runner()
    output = tmp_path / "preview.mp4"
    spec = RenderSpec("1.0.0", "r", "c", {"path": "/safe/source.mp4"}, (360, 640), (100, 1100), (), (), {}, None, {}, "shorts")
    asyncio.run(FfmpegPreviewRenderer(runner).render(spec, output))
    command = runner.argv[0]
    assert command[command.index("-ss") + 1] == "0.100"
    assert command[command.index("-to") + 1] == "1.100"
    assert "libx264" in command and "aac" in command
