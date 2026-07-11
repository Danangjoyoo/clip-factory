import type { UploadSessionEntityDto } from '../../../application/dto/entity/upload-session-entity.dto';
import type { UploadSessionRecordDto } from '../dto/record/upload-session-record.dto';
export function uploadSessionRecordToEntity(
  record: UploadSessionRecordDto,
): UploadSessionEntityDto {
  return {
    ...record,
    kind: record.kind as UploadSessionEntityDto['kind'],
    objectReference:
      record.objectReferenceJson as UploadSessionEntityDto['objectReference'],
  };
}
export function uploadSessionEntityToRecord(
  entity: UploadSessionEntityDto,
): UploadSessionRecordDto {
  const { objectReference, ...rest } = entity;
  return { ...rest, objectReferenceJson: objectReference };
}
