import type { RenderEntityDto } from '../../../application/dto/entity';
import type { RenderRecordDto } from '../dto/record/render-record.dto';
export const renderRecordToEntity = (record: RenderRecordDto) => ({
  ...(record.inputSnapshotJson as RenderEntityDto),
  renderId: record.renderId,
  projectId: record.projectId,
  clipId: record.clipId,
  status: record.status === 'COMPLETED' ? 'SUCCEEDED' : record.status as RenderEntityDto['status'],
  outputKey: record.outputObjectKey,
  srtObjectKey: record.srtObjectKey,
  retryOfRenderId: record.retryOfRenderId,
  errorCode: record.errorCode,
});
export const renderEntityToRecord = (entity: RenderEntityDto): RenderRecordDto => ({
  renderId: entity.renderId,
  projectId: entity.projectId,
  clipId: entity.clipId,
  inputSnapshotJson: entity,
  status: entity.status === 'SUCCEEDED' ? 'COMPLETED' : entity.status,
  outputObjectKey: entity.outputKey ?? null,
  srtObjectKey: entity.srtObjectKey ?? null,
  retryOfRenderId: entity.retryOfRenderId ?? null,
  errorCode: entity.errorCode ?? null,
});
