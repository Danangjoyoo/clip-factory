import { z } from 'zod';
export const StartUploadApiSchema = z.object({
  sourceAssetId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.string().regex(/^\d+$/u),
  totalParts: z.number().int().min(1).max(10000),
});
export const CompleteUploadApiSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  parts: z.array(
    z.object({
      partNumber: z.number().int(),
      etag: z.string(),
      sizeBytes: z.string().regex(/^\d+$/u),
    }),
  ),
});
export const PresignUploadPartsApiSchema = z.object({
  totalParts: z.number().int().min(1).max(10000),
  parts: z.array(
    z.object({
      partNumber: z.number().int().min(1).max(10000),
      checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/u),
    }),
  ),
});
