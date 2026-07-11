import asyncio

from clip_factory.adapters.media.encoder_probe import EncoderProbe


class Runner:
    def __init__(self) -> None:
        self.calls = []

    async def run(self, argv, on_stdout_line=None):
        self.calls.append(list(argv))
        return (0, "h264_videotoolbox", "") if len(self.calls) == 1 else (0, "", "")


def test_probe_prefers_videotoolbox_only_when_capable() -> None:
    runner = Runner()
    assert asyncio.run(EncoderProbe(runner).select()) == "VIDEOTOOLBOX"
    assert EncoderProbe.encoder_args("SOFTWARE") == ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p"]
