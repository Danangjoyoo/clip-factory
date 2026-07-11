import type { UploadSessionStatus } from '../../../../application/dto/entity/upload-session-entity.dto';
export interface UploadSessionRecordDto {
  id: string; projectId: string; sourceAssetId: string; kind: string; objectKey: string; uploadId: string; fileName: string; contentType: string; declaredSizeBytes: bigint; totalParts: number; status: UploadSessionStatus; completedPartsHash: string | null; objectReferenceJson: unknown; expiresAt: Date; createdAt: Date; updatedAt: Date;
}
