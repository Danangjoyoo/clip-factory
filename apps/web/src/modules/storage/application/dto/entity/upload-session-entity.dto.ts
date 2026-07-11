import type { SourceKind } from '../../../../projects/domain/project';
import type { ImmutableObjectReference } from '../../ports/artifact-store.port';

export type UploadSessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABORTED' | 'EXPIRED';
export interface UploadSessionEntityDto {
  id: string;
  projectId: string;
  sourceAssetId: string;
  kind: SourceKind;
  objectKey: string;
  uploadId: string;
  fileName: string;
  contentType: string;
  declaredSizeBytes: bigint;
  totalParts: number;
  status: UploadSessionStatus;
  completedPartsHash: string | null;
  objectReference: ImmutableObjectReference | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
