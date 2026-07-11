import type { RenderEntityDto } from '../../application/dto/entity';
import type { RenderRecordDto } from '../dto/record/render-record.dto';
export const renderRecordToEntity = (record: RenderRecordDto) => ({ ...(record.snapshotJson as RenderEntityDto), renderId: record.renderId, clipId: record.clipId, status: record.status as RenderEntityDto['status'], outputKey: record.outputKey, errorCode: record.errorCode });
export const renderEntityToRecord = (entity: RenderEntityDto): RenderRecordDto => ({ renderId: entity.renderId, clipId: entity.clipId, snapshotJson: entity, status: entity.status, outputKey: entity.outputKey ?? null, errorCode: entity.errorCode ?? null });
