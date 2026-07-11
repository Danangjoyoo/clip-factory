from pathlib import Path
import asyncio
from collections.abc import Sequence
import pytest

from clip_factory.adapters.media.ffprobe_adapter import FfprobeAdapter, FfprobeError


class Runner:
    def __init__(self, stdout: str, code: int = 0) -> None:
        self.stdout = stdout
        self.code = code

    async def run(
        self, argv: Sequence[str | Path], on_stdout_line: object = None
    ) -> tuple[int, str, str]:
        return self.code, self.stdout, ""


def test_probe_maps_ffprobe_json() -> None:
    probe = asyncio.run(
        FfprobeAdapter(
            Runner(
                '{"format":{"duration":"1.5","size":"42","format_name":"mov"},"streams":[{"codec_type":"video","codec_name":"h264","width":320,"height":240,"r_frame_rate":"30/1"},{"codec_type":"audio","codec_name":"aac","sample_rate":"16000"}]}'
            )
        ).probe(Path("input.mov"))
    )
    assert probe.duration_ms == 1500
    assert probe.container == "mov"
    assert probe.audio_codec == "aac"


@pytest.mark.parametrize("payload", ["not json", '{"format":{},"streams":[]}'])
def test_probe_rejects_malformed_or_missing_streams(payload: str) -> None:
    with pytest.raises(FfprobeError) as error:
        asyncio.run(FfprobeAdapter(Runner(payload)).probe(Path("input.mov")))
    assert error.value.code in {"FFPROBE_INVALID_JSON", "VIDEO_STREAM_REQUIRED"}


def test_probe_maps_nonzero_process_to_typed_failure() -> None:
    with pytest.raises(FfprobeError, match="FFPROBE_FAILED"):
        asyncio.run(FfprobeAdapter(Runner("", code=1)).probe(Path("input.mov")))
