import { expect, it } from 'vitest';
import {
  sourceAssetEntityToRecord,
  sourceAssetRecordToEntity,
} from './source-asset.converter';
it('maps nullable, bigint, JSON, enum, and timestamp source fields explicitly', () => {
  const record = {
    id: 's1',
    projectId: 'p1',
    kind: 'LOCAL_FILE',
    displayPath: '/tmp/a.mov',
    resolvedPath: null,
    objectKey: null,
    objectVersionId: 'v1',
    objectSha256: null,
    sizeBytes: 3n,
    modifiedAt: null,
    fingerprint: 'f',
    probeJson: { duration: 3 },
    health: 'UNKNOWN',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  } as const;
  expect(sourceAssetRecordToEntity(record)).toEqual({
    id: record.id,
    projectId: record.projectId,
    kind: record.kind,
    displayPath: record.displayPath,
    resolvedPath: record.resolvedPath,
    objectKey: record.objectKey,
    objectVersionId: record.objectVersionId,
    objectSha256: record.objectSha256,
    sizeBytes: record.sizeBytes,
    modifiedAt: record.modifiedAt,
    fingerprint: record.fingerprint,
    probe: record.probeJson,
    health: record.health,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
  expect(sourceAssetEntityToRecord(sourceAssetRecordToEntity(record))).toEqual(
    record,
  );
});
