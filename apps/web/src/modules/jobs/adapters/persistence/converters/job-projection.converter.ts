import type { JobProjectionEntityDto } from '../../../application/dto/entity';
import type { JobProjectionRecordDto } from '../dto/record/job-projection-record.dto';
export const jobProjectionRecordToEntity = (
  r: JobProjectionRecordDto,
): JobProjectionEntityDto => ({
  id: r.id,
  projectId: r.projectId,
  workflowId: r.workflowId,
  status: r.status,
  terminalResult:
    r.terminalResultJson as JobProjectionEntityDto['terminalResult'],
});
