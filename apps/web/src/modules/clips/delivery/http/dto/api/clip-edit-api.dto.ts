import { z } from 'zod';
export const ClipEditApiSchema = z.object({
  renderId: z.string().min(1),
  source: z.record(z.string(), z.unknown()),
  range: z.object({
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
  }),
  captions: z.object({
    version: z.literal(1),
    languageTag: z.string().min(1),
    cues: z.array(z.record(z.string(), z.unknown())),
  }),
  style: z.record(z.string(), z.unknown()),
  frame: z.record(z.string(), z.unknown()),
  title: z.string().max(120).nullable(),
  platformPreset: z.enum(['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK']),
  encoder: z.record(z.string(), z.unknown()).nullable(),
});
export type ClipEditApiDto = z.infer<typeof ClipEditApiSchema>;
