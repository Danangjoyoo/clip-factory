import { prisma } from '../../../../../infrastructure/prisma/client';
import type { JobProjectionRepository } from '../../../application/ports/job-projection.repository';
import type { ApplyWorkerResultResponse } from '../../../application/dto/entity';
export class PrismaJobProjectionRepository implements JobProjectionRepository {
  async findByWorkflowId(workflowId: string, tx?: any) {
    const db = tx?.jobProjection ?? prisma.jobProjection;
    const r = await db.findFirst({ where: { workflowId } });
    return r
      ? {
          id: r.id,
          projectId: r.projectId,
          workflowId: r.workflowId,
          status: r.status,
          terminalResult: r.terminalResultJson as any,
        }
      : null;
  }
  async recordResult(
    workflowId: string,
    result: ApplyWorkerResultResponse,
    tx?: any,
  ) {
    const db = tx?.jobProjection ?? prisma.jobProjection;
    await db.updateMany({
      where: { workflowId },
      data: { status: result.status, terminalResultJson: result },
    });
  }
}
