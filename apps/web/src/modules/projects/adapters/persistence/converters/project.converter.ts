import type { ProjectEntityDto } from '../../../application/dto/entity';
import type { ProjectRecordDto } from '../dto/record/project-record.dto';
export const projectRecordToEntity = (
  r: ProjectRecordDto,
): ProjectEntityDto => ({ ...r });
export const projectEntityToRecord = (
  e: Omit<ProjectEntityDto, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<ProjectRecordDto, 'id' | 'createdAt' | 'updatedAt'> =>
  ({ ...e }) as never;
