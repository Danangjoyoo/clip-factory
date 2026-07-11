import type { SourceHealth, SourceKind } from '../../../domain/project';
export interface SourceAssetEntityDto {
  id: string;
  projectId: string;
  kind: SourceKind;
  displayPath: string;
  resolvedPath: string | null;
  objectKey: string | null;
  objectVersionId: string | null;
  objectSha256: string | null;
  sizeBytes: bigint | null;
  modifiedAt: Date | null;
  fingerprint: string | null;
  probe: unknown | null;
  health: SourceHealth;
  createdAt: Date;
  updatedAt: Date;
}
export type CreateSourceAssetEntityDto = Omit<
  SourceAssetEntityDto,
  'id' | 'createdAt' | 'updatedAt'
>;
