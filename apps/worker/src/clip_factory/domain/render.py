from dataclasses import dataclass


@dataclass(frozen=True)
class RenderOutput:
    width: int
    height: int
    video_codec: str
    audio_codec: str
    container: str
    duration_ms: int


def validate_render_output(output: RenderOutput) -> None:
    if (output.width, output.height) != (1080, 1920):
        raise ValueError("RENDER_OUTPUT_INVALID")
    if output.video_codec != "h264" or output.audio_codec != "aac" or output.container != "mp4":
        raise ValueError("RENDER_OUTPUT_INVALID")
    if output.duration_ms <= 0:
        raise ValueError("RENDER_OUTPUT_INVALID")
