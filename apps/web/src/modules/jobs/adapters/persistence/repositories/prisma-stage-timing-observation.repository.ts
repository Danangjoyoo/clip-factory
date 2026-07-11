import { prisma } from '../../../../../infrastructure/prisma/client';
import type {
  StageTimingObservationRepository,
  StageTimingObservationRecord,
} from '../../../application/ports/stage-timing-observation.repository';
export class PrismaStageTimingObservationRepository implements StageTimingObservationRepository {
  async create(record: StageTimingObservationRecord, tx?: any) {
    await (tx?.stageTimingObservation ?? prisma.stageTimingObservation).create({
      data: record,
    });
  }
  async listThroughputs(
    stage: string,
    hardwareKey: string,
    backendKey: string,
  ) {
    const rows = await prisma.stageTimingObservation.findMany({
      where: { stage, hardwareKey, backendKey },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => Number(r.throughputMicrounits) / 1_000_000);
  }
}
