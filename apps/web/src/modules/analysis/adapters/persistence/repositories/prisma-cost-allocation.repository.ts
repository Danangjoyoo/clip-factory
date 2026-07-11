import { prisma } from '../../../../../infrastructure/prisma/client';
import type { CostAllocationRepository } from '../../../application/ports/cost-allocation.repository';
import type { AnalysisTransaction } from '../../../application/ports/unit-of-work.port';
import type { CostAllocationEntityDto } from '../../../application/dto/entity';
export class PrismaCostAllocationRepository implements CostAllocationRepository {
  async insertMany(
    rows: readonly Omit<CostAllocationEntityDto, 'id' | 'createdAt'>[],
    tx?: AnalysisTransaction,
  ) {
    const db = tx ?? prisma;
    const created = await Promise.all(
      rows.map((r: Omit<CostAllocationEntityDto, 'id' | 'createdAt'>) =>
        db.costAllocation.create({
          data: {
            analysisRunId: r.analysisRunId,
            clipId: r.clipId,
            method: r.method,
            amountMicrousd: r.amountMicrousd,
          },
        }),
      ),
    );
    return created.map((r) => ({
      id: r.id,
      analysisRunId: r.analysisRunId,
      clipId: r.clipId,
      method: r.method,
      amountMicrousd: r.amountMicrousd,
      label: 'allocated estimate' as const,
      methodLabel: 'equal share' as const,
      createdAt: r.createdAt,
    }));
  }
}
