import asyncio
from clip_factory.adapters.media.ffmpeg_render_engine import FfmpegRenderEngine


def test_render_uses_safe_argv_and_quality_defaults(tmp_path):
    calls = []
    class Runner:
        async def run(self, argv, on_stdout_line=None):
            calls.append(list(argv))
            return 0, "", ""
    output = tmp_path / "out.mp4"
    asyncio.run(FfmpegRenderEngine(Runner()).render(tmp_path / "source.mp4", output, tmp_path / "captions.ass", "SOFTWARE"))
    argv = [str(value) for value in calls[0]]
    assert "libx264" in argv and "-preset" in argv and "slow" in argv
    assert "-crf" in argv and "18" in argv and "-b:a" in argv and "192k" in argv
    assert "-map" in argv and "0:a:0" in argv
