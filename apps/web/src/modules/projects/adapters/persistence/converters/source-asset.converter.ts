import type { SourceAssetEntityDto } from '../../../application/dto/entity';
import type { SourceAssetRecordDto } from '../dto/record/source-asset-record.dto';
export const sourceAssetRecordToEntity = (
  r: SourceAssetRecordDto,
): SourceAssetEntityDto => ({
  id: r.id,
  projectId: r.projectId,
  kind: r.kind,
  displayPath: r.displayPath,
  resolvedPath: r.resolvedPath,
  objectKey: r.objectKey,
  objectVersionId: r.objectVersionId,
  objectSha256: r.objectSha256,
  sizeBytes: r.sizeBytes,
  modifiedAt: r.modifiedAt,
  fingerprint: r.fingerprint,
  probe: r.probeJson,
  health: r.health,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
export const sourceAssetEntityToRecord = (
  e: SourceAssetEntityDto,
): SourceAssetRecordDto => ({
  id: e.id,
  projectId: e.projectId,
  kind: e.kind,
  displayPath: e.displayPath,
  resolvedPath: e.resolvedPath,
  objectKey: e.objectKey,
  objectVersionId: e.objectVersionId,
  objectSha256: e.objectSha256,
  sizeBytes: e.sizeBytes,
  modifiedAt: e.modifiedAt,
  fingerprint: e.fingerprint,
  probeJson: e.probe,
  health: e.health,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});
