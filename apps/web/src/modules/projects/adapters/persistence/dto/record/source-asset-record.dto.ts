import type {
  SourceKindRecord,
  SourceHealthRecord,
} from '../../../../../../generated/prisma/enums';
export interface SourceAssetRecordDto {
  id: string;
  projectId: string;
  kind: SourceKindRecord;
  displayPath: string;
  resolvedPath: string | null;
  objectKey: string | null;
  objectVersionId: string | null;
  objectSha256: string | null;
  sizeBytes: bigint | null;
  modifiedAt: Date | null;
  fingerprint: string | null;
  probeJson: unknown | null;
  health: SourceHealthRecord;
  createdAt: Date;
  updatedAt: Date;
}
