import { prisma } from '../../../../../infrastructure/prisma/client';
import type { CostAllocationEntityDto } from '../../../application/dto/entity';
import type { CostAllocationRepository } from '../../../application/ports/cost-allocation.repository';
export class PrismaCostAllocationRepository implements CostAllocationRepository {
  async insertMany(
    rows: readonly Omit<CostAllocationEntityDto, 'id' | 'createdAt'>[],
    tx?: any,
  ) {
    const db = tx ?? prisma;
    await db.costAllocation.createMany({
      data: rows.map((r) => ({
        analysisRunId: r.analysisRunId,
        clipId: r.clipId,
        method: r.method,
        amountMicrousd: r.amountMicrousd,
      })),
    });
    return [];
  }
}
