from pathlib import Path
import asyncio
from collections.abc import Sequence

from clip_factory.adapters.media.ffprobe_adapter import FfprobeAdapter


class Runner:
    async def run(self, argv: Sequence[str | Path], on_stdout_line: object = None) -> tuple[int, str, str]:
        return 0, '{"format":{"duration":"1.5","size":"42","format_name":"mov"},"streams":[{"codec_type":"video","codec_name":"h264","width":320,"height":240,"r_frame_rate":"30/1"},{"codec_type":"audio","codec_name":"aac","sample_rate":"16000"}]}', ""


def test_probe_maps_ffprobe_json() -> None:
    probe = asyncio.run(FfprobeAdapter(Runner()).probe(Path("input.mov")))
    assert probe.duration_ms == 1500
    assert probe.container == "mov"
    assert probe.audio_codec == "aac"
