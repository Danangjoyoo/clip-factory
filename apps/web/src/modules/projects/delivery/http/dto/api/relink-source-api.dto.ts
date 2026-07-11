import { z } from 'zod';
export const RelinkSourceApiSchema = z.object({
  displayPath: z.string().min(1),
  resolvedPath: z.string().min(1),
  sizeBytes: z.string(),
  modifiedAt: z.string().datetime(),
  fingerprint: z.string().length(64),
  probe: z.unknown().optional(),
  confirmedFingerprint: z.string().length(64).optional(),
}).strict();
