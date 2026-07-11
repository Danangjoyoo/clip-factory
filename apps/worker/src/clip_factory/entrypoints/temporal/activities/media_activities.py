from dataclasses import dataclass
from uuid import UUID

from clip_factory.application.preprocess_source import PreprocessSource
from clip_factory.ports.source_preprocessor import PreparedSource, ProgressCallback


@dataclass(frozen=True)
class PreprocessSourceInput:
    source_asset_id: UUID
    project_id: UUID


@dataclass(frozen=True)
class PreprocessSourceActivity:
    service: PreprocessSource
    heartbeat: ProgressCallback

    async def __call__(self, payload: PreprocessSourceInput) -> PreparedSource:
        return await preprocess_source(self.service, payload, self.heartbeat)


async def preprocess_source(
    service: PreprocessSource,
    payload: PreprocessSourceInput,
    heartbeat: ProgressCallback,
) -> PreparedSource:
    return await service.execute(payload.source_asset_id, payload.project_id, heartbeat)
