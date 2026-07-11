import { z } from 'zod';
export const AddClipApiSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type AddClipApiDto = z.infer<typeof AddClipApiSchema>;
