from uuid import UUID

from clip_factory.ports.source_preprocessor import (
    PreparedSource,
    ProgressCallback,
    SourcePreprocessorPort,
)


class PreprocessSource:
    def __init__(self, preprocessor: SourcePreprocessorPort) -> None:
        self._preprocessor = preprocessor

    async def execute(
        self, source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback
    ) -> PreparedSource:
        return await self._preprocessor.prepare(source_asset_id, project_id, heartbeat)
