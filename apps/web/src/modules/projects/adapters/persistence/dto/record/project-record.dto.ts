import type {
  ProjectModeRecord,
  ProjectStatusRecord,
  PlatformPresetRecord,
} from '../../../../../../generated/prisma/enums';
export interface ProjectRecordDto {
  id: string;
  name: string;
  mode: ProjectModeRecord;
  languageTag: string;
  defaultMaxClipSeconds: number;
  defaultPlatformPreset: PlatformPresetRecord;
  status: ProjectStatusRecord;
  activeWorkflowId: string | null;
  openaiSpendMicrousd: bigint;
  createdAt: Date;
  updatedAt: Date;
}
