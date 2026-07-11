import type { ProjectEntityDto } from '../../../application/dto/entity';
import type { ProjectRecordDto } from '../dto/record/project-record.dto';
import {
  PlatformPreset,
  ProjectMode,
  ProjectStatus,
} from '../../../domain/project';

const mode = (value: ProjectRecordDto['mode']): ProjectEntityDto['mode'] =>
  value === 'MANUAL' ? ProjectMode.MANUAL : ProjectMode.AI_HIGHLIGHTS;
const status = (
  value: ProjectRecordDto['status'],
): ProjectEntityDto['status'] => ProjectStatus[value];
const platform = (
  value: ProjectRecordDto['defaultPlatformPreset'],
): ProjectEntityDto['defaultPlatformPreset'] => PlatformPreset[value];

export const projectRecordToEntity = (
  r: ProjectRecordDto,
): ProjectEntityDto => ({
  id: r.id,
  name: r.name,
  mode: mode(r.mode),
  languageTag: r.languageTag,
  defaultMaxClipSeconds: r.defaultMaxClipSeconds,
  defaultPlatformPreset: platform(r.defaultPlatformPreset),
  status: status(r.status),
  activeWorkflowId: r.activeWorkflowId,
  openaiSpendMicrousd: r.openaiSpendMicrousd,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
export const projectEntityToRecord = (
  e: Omit<ProjectEntityDto, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<ProjectRecordDto, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: e.name,
  mode: e.mode,
  languageTag: e.languageTag,
  defaultMaxClipSeconds: e.defaultMaxClipSeconds,
  defaultPlatformPreset: e.defaultPlatformPreset,
  status: e.status,
  activeWorkflowId: e.activeWorkflowId,
  openaiSpendMicrousd: e.openaiSpendMicrousd,
});
