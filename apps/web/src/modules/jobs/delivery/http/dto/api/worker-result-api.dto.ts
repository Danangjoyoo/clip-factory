import { z } from 'zod';
const ObjectReference = z
  .object({
    bucket: z.string().min(1),
    key: z.string().min(1),
    versionId: z.string().min(1).nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const WorkerResultApiSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    projectId: z.string().uuid(),
    status: z.enum(['COMPLETED', 'FAILED', 'CANCELLED', 'PAID_CALL_UNCERTAIN']),
    completedAt: z.string().datetime().nullable(),
    transcriptObject: ObjectReference.nullable().optional(),
    clipIds: z.array(z.string().uuid()).default([]),
    error: z
      .object({ code: z.string().min(1), message: z.string().min(1) })
      .strict()
      .nullable()
      .optional(),
    uncertainReservedMicrousd: z
      .string()
      .regex(/^[0-9]+$/)
      .optional(),
    requiredAction: z.literal('AUTHORIZE_FRESH_RESERVATION').optional(),
    acknowledgePossiblePriorSpend: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === 'PAID_CALL_UNCERTAIN' &&
      (!value.uncertainReservedMicrousd ||
        value.requiredAction !== 'AUTHORIZE_FRESH_RESERVATION')
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'uncertain result requires reservation metadata',
      });
    if (value.acknowledgePossiblePriorSpend && value.status !== 'COMPLETED')
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'acknowledgement requires a completed retry',
      });
  });
export type WorkerResultApiDto = z.infer<typeof WorkerResultApiSchema>;
