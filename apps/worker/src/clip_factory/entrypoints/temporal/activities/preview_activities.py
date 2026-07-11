from dataclasses import dataclass

from clip_factory.application.generate_preview import (
    GeneratePreview,
    PreviewArtifacts,
    PreviewCommand,
)


@dataclass(frozen=True)
class GeneratePreviewActivity:
    service: GeneratePreview

    async def __call__(self, command: PreviewCommand) -> PreviewArtifacts:
        return await self.service.execute(command)
