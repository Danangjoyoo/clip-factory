from collections.abc import Callable


class EncoderProbe:
    def __init__(self, run: Callable[[list[str]], str | bool]) -> None:
        self._run = run

    def select(self) -> str:
        result = self._run(["ffmpeg -encoders"])
        return "VIDEOTOOLBOX" if result else "SOFTWARE"
