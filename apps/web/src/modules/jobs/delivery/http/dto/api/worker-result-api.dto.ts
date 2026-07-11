import { z } from 'zod';
export const WorkerResultApiSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    projectId: z.string().uuid(),
    status: z.enum(['COMPLETED', 'FAILED', 'CANCELLED']),
    completedAt: z.string().datetime(),
    transcriptObject: z.unknown().nullable().optional(),
    clipIds: z.array(z.string().uuid()).default([]),
    error: z.unknown().nullable().optional(),
  })
  .strict();
export type WorkerResultApiDto = z.infer<typeof WorkerResultApiSchema>;
