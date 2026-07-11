import { z } from 'zod';
export const RelinkSourceApiSchema = z
  .object({
    displayPath: z.string().min(1),
    resolvedPath: z.string().min(1),
    confirmedFingerprint: z.string().length(64).optional(),
  })
  .strict();
