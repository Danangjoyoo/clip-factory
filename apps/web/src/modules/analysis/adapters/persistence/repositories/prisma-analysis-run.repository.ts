import { prisma } from '../../../../../infrastructure/prisma/client';
import type { AnalysisRunRepository } from '../../../application/ports/analysis-run.repository';
export class PrismaAnalysisRunRepository implements AnalysisRunRepository {
  async findById(id: string, tx?: any) {
    return (tx ?? prisma).analysisRun.findUnique({ where: { id } });
  }
  async addActualCost(id: string, amount: bigint, tx?: any) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: { actualMicrousd: { increment: amount } },
    });
  }
  async addUncertain(id: string, amount: bigint, tx?: any) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: {
        status: 'PAID_CALL_UNCERTAIN',
        uncertainCallCount: { increment: 1 },
        uncertainReservedMicrousd: { increment: amount },
      },
    });
  }
  async reconcileUncertain(id: string, amount: bigint, tx?: any) {
    await (tx ?? prisma).analysisRun.update({
      where: { id },
      data: {
        uncertainCallCount: { decrement: 1 },
        uncertainReservedMicrousd: { decrement: amount },
      },
    });
  }
}
