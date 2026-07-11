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
    if (amount <= 0n) throw new Error('UNCERTAIN_AMOUNT_INVALID');
    const db = tx ?? prisma;
    const changed = await db.analysisRun.updateMany({
      where: {
        id,
        uncertainCallCount: { gte: 1 },
        uncertainReservedMicrousd: { gte: amount },
      },
      data: {
        uncertainCallCount: { decrement: 1 },
        uncertainReservedMicrousd: { decrement: amount },
      },
    });
    if (changed.count !== 1)
      throw new Error('UNCERTAIN_RESERVATION_MISMATCH');
    const current = await db.analysisRun.findUnique({ where: { id } });
    if (!current) throw new Error('UNCERTAIN_RESERVATION_MISMATCH');
    await db.analysisRun.update({
      where: { id },
      data: {
        status: current.uncertainCallCount === 0 ? 'RUNNING' : 'PAID_CALL_UNCERTAIN',
      },
    });
  }
}
