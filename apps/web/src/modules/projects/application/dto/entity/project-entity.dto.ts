import type {
  PlatformPreset,
  ProjectMode,
  ProjectStatus,
} from '../../../domain/project';
export interface ProjectEntityDto {
  id: string;
  name: string;
  mode: ProjectMode;
  languageTag: string;
  defaultMaxClipSeconds: number;
  defaultPlatformPreset: PlatformPreset;
  status: ProjectStatus;
  activeWorkflowId: string | null;
  openaiSpendMicrousd: bigint;
  createdAt: Date;
  updatedAt: Date;
}
export type CreateProjectEntityRequest = {
  name: string;
  mode: ProjectMode;
  languageTag: string;
  defaultMaxClipSeconds: number;
  defaultPlatformPreset: PlatformPreset;
  source:
    | { kind: 'LOCAL_FILE'; displayPath: string }
    | { kind: 'BROWSER_UPLOAD'; fileName: string; sizeBytes: bigint };
};
export type CreateProjectEntityDto = Omit<
  ProjectEntityDto,
  'id' | 'createdAt' | 'updatedAt'
>;
