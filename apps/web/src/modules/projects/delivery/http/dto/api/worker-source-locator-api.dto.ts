import { z } from 'zod';
export const WorkerSourceValidationApiSchema = z
  .object({
    sourceAssetId: z.string().uuid(),
    kind: z.literal('LOCAL_FILE'),
    resolvedPath: z.string().min(1),
    sizeBytes: z.string(),
    modifiedAt: z.string().datetime(),
    fingerprint: z.string().length(64),
    probe: z.unknown(),
  })
  .strict();
