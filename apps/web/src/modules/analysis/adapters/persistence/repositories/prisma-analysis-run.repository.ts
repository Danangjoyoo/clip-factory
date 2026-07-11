import { prisma } from '../../../../../infrastructure/prisma/client';
import { analysisRunRecordToEntity } from '../converters/analysis-run.converter';
import type { AnalysisRunRepository } from '../../../application/ports/analysis-run.repository';
import type { AnalysisTransaction } from '../../../application/ports/unit-of-work.port';
export class PrismaAnalysisRunRepository implements AnalysisRunRepository {
  async findById(id: string, tx?: AnalysisTransaction) {
    const row = await (tx ?? prisma).analysisRun.findUnique({ where: { id } });
    return row ? analysisRunRecordToEntity(row) : null;
  }
  async addActualCost(id: string, amount: bigint, tx?: AnalysisTransaction) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: { actualMicrousd: { increment: amount } },
    });
  }
  async addUncertain(id: string, amount: bigint, tx?: AnalysisTransaction) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: {
        status: 'PAID_CALL_UNCERTAIN',
        uncertainCallCount: { increment: 1 },
        uncertainReservedMicrousd: { increment: amount },
      },
    });
  }
  async reconcileUncertain(id: string, amount: bigint, tx?: AnalysisTransaction) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: {
        uncertainCallCount: { decrement: 1 },
        uncertainReservedMicrousd: { decrement: amount },
      },
    });
  }
}
