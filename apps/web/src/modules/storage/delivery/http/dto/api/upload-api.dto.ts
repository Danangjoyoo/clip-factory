import { z } from 'zod';
export const StartUploadApiSchema = z.object({ sourceAssetId: z.string().min(1), fileName: z.string().min(1), contentType: z.string().min(1), sizeBytes: z.string().regex(/^\d+$/u), totalParts: z.number().int().min(1).max(10000) });
export const CompleteUploadApiSchema = z.object({ parts: z.array(z.object({ partNumber: z.number().int(), etag: z.string(), sizeBytes: z.string().regex(/^\d+$/u) })) });
