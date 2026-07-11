import { z } from 'zod';
export const AddClipApiSchema = z.object({ start: z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/u), end: z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/u) }).strict();
export type AddClipApiDto = z.infer<typeof AddClipApiSchema>;
