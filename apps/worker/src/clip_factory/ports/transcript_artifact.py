from typing import Protocol

from clip_factory.ports.source_preprocessor import ObjectReference


class TranscriptArtifactLoader(Protocol):
    async def load_text(self, reference: ObjectReference) -> str: ...
