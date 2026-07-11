import { z } from 'zod';
export const ProgressEventApiSchema = z.object({
  projectId: z.string().uuid(),
  workflowId: z.string().uuid(),
  stage: z.string().min(1).max(100),
  completedUnits: z.number().int().nonnegative(),
  totalUnits: z.number().int().positive(),
  unit: z.string(),
  progressBasisPoints: z.number().int().min(0).max(10000),
  eta: z.object({
    lowSeconds: z.number().int().nonnegative().nullable(),
    highSeconds: z.number().int().nonnegative().nullable(),
    confidence: z.string(),
  }),
  occurredAt: z.string(),
});
export type ProgressEventApiDto = z.infer<typeof ProgressEventApiSchema>;
