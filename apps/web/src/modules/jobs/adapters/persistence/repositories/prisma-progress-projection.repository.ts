import { prisma } from '../../../../../infrastructure/prisma/client';
import type { ProgressPresentation } from '../../../domain/progress';
import type { ProgressProjectionRepository } from '../../../application/services/record-progress.service';

const activeStatuses = [
  'QUEUED',
  'RUNNING',
  'WAITING',
  'WORKER_OFFLINE',
] as const;

export class PrismaProgressProjectionRepository implements ProgressProjectionRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  async upsert(event: ProgressPresentation) {
    const occurredAt = new Date(event.heartbeatAt ?? event.occurredAt);
    const status = (event.status ??
      'RUNNING') as (typeof activeStatuses)[number];
    const data = {
      projectId: event.projectId,
      runId: event.workflowId,
      status,
      stage: event.stage,
      progressBasisPoints: event.progressBasisPoints,
      etaLowSeconds: event.eta.lowSeconds,
      etaHighSeconds: event.eta.highSeconds,
      lastHeartbeatAt: occurredAt,
    };
    if (!(await this.isNewer(event.workflowId, occurredAt))) return;
    await this.db.jobProjection.upsert({
      where: {
        workflowId_runId: {
          workflowId: event.workflowId,
          runId: event.workflowId,
        },
      },
      create: { workflowId: event.workflowId, ...data },
      update: data,
    });
  }

  async findActive(projectId: string): Promise<ProgressPresentation[]> {
    const rows = await this.db.jobProjection.findMany({
      where: { projectId, status: { in: [...activeStatuses] } },
    });
    return rows.map((row) => ({
      projectId: row.projectId,
      workflowId: row.workflowId,
      stage: row.stage,
      progressBasisPoints: row.progressBasisPoints,
      eta: {
        lowSeconds: row.etaLowSeconds,
        highSeconds: row.etaHighSeconds,
        confidence: 'LOW' as const,
      },
      completedUnits: row.progressBasisPoints,
      totalUnits: 10000,
      unit: 'BASIS_POINTS',
      occurredAt: (row.lastHeartbeatAt ?? row.updatedAt).toISOString(),
      status: row.status,
      ...(row.lastHeartbeatAt
        ? { heartbeatAt: row.lastHeartbeatAt.toISOString() }
        : {}),
    }));
  }

  private async isNewer(workflowId: string, occurredAt: Date) {
    const row = await this.db.jobProjection.findFirst({
      where: { workflowId },
    });
    if (row && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(row.status))
      return false;
    return !row?.lastHeartbeatAt || occurredAt >= row.lastHeartbeatAt;
  }
}
