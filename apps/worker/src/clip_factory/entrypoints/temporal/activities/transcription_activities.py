from clip_factory.application.transcribe_source import (
    TranscribeCommand,
    TranscribeSource,
)


from typing import Any, Awaitable, Callable


def build_transcription_activity(
    service: TranscribeSource,
) -> Callable[[TranscribeCommand], Awaitable[Any]]:
    async def transcribe(command: TranscribeCommand) -> Any:
        return await service.execute(command)

    return transcribe
