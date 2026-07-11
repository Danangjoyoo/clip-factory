import { z } from 'zod';
import type {
  CreateProjectEntityRequest,
  ProjectEntityDto,
} from '../../application/dto/entity';
import { PlatformPreset, ProjectMode, SourceKind } from '../../domain/project';
export const ProjectModeApi = ProjectMode;
export const SourceTypeApi = {
  FILEPATH: 'FILEPATH',
  UPLOAD: 'UPLOAD',
} as const;
export const PlatformPresetApi = PlatformPreset;
export const CreateProjectApiSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    mode: z.enum(['AI_HIGHLIGHTS', 'MANUAL']),
    language: z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u),
    maxClipSeconds: z.number().int().min(1).max(10800),
    platform: z.enum(['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK']),
    source: z.discriminatedUnion('type', [
      z
        .object({ type: z.literal('FILEPATH'), path: z.string().min(1) })
        .strict(),
      z
        .object({
          type: z.literal('UPLOAD'),
          fileName: z.string().min(1),
          sizeBytes: z.string().regex(/^\d+$/u),
        })
        .strict(),
    ]),
  })
  .strict();
export type CreateProjectApiRequest = z.infer<typeof CreateProjectApiSchema>;
export const createProjectApiToEntity = (
  input: CreateProjectApiRequest,
): CreateProjectEntityRequest => ({
  name: input.name,
  mode: input.mode,
  languageTag: input.language,
  defaultMaxClipSeconds: input.maxClipSeconds,
  defaultPlatformPreset: input.platform,
  source:
    input.source.type === 'FILEPATH'
      ? { kind: SourceKind.LOCAL_FILE, displayPath: input.source.path }
      : {
          kind: SourceKind.BROWSER_UPLOAD,
          fileName: input.source.fileName,
          sizeBytes: BigInt(input.source.sizeBytes),
        },
});
export const projectEntityToApi = (value: {
  project: ProjectEntityDto;
  source?: { kind: string; displayPath: string; health: string } | null;
}) => ({
  id: value.project.id,
  name: value.project.name,
  mode: value.project.mode,
  language: value.project.languageTag,
  maxClipSeconds: value.project.defaultMaxClipSeconds,
  platform: value.project.defaultPlatformPreset,
  status: value.project.status,
  openaiSpendMicrousd: value.project.openaiSpendMicrousd.toString(),
  source: value.source && {
    kind: value.source.kind,
    displayLabel: (() => {
      const label =
        value.source.kind === 'LOCAL_FILE'
          ? value.source.displayPath.split(/[\\/]/).filter(Boolean).pop()
          : value.source.displayPath;
      return label || 'source';
    })(),
    health: value.source.health,
  },
  createdAt: value.project.createdAt.toISOString(),
  updatedAt: value.project.updatedAt.toISOString(),
});
