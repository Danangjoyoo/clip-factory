import { z } from 'zod';
export const FocalPointApiSchema = z.object({
  projectWorkflowId: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  x: z.string(),
  y: z.string(),
});
export type FocalPointApiDto = z.infer<typeof FocalPointApiSchema>;
