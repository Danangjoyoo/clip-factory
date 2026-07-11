from dataclasses import dataclass
from uuid import UUID

from clip_factory.application.preprocess_source import PreprocessSource
from clip_factory.ports.source_preprocessor import PreparedSource


@dataclass(frozen=True)
class PreprocessSourceInput:
    source_asset_id: UUID
    project_id: UUID


async def preprocess_source(
    service: PreprocessSource,
    payload: PreprocessSourceInput,
) -> PreparedSource:
    return await service.execute(payload.source_asset_id, payload.project_id, lambda *_: None)
