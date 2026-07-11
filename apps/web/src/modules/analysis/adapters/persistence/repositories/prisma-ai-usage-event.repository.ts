import { prisma } from '../../../../../infrastructure/prisma/client';
import type { AIUsageEventEntityDto } from '../../../application/dto/entity';
import type { AIUsageEventRepository } from '../../../application/ports/ai-usage-event.repository';
export class PrismaAIUsageEventRepository implements AIUsageEventRepository {
  async findByProviderResponseId(id: string, tx?: any) {
    const row = await (tx ?? prisma).aIUsageEvent.findUnique({
      where: { providerResponseId: id },
    });
    return row
      ? ({
          ...row,
          totalInputTokens: BigInt(row.inputTokens),
        } as unknown as AIUsageEventEntityDto)
      : null;
  }
  async insert(event: Omit<AIUsageEventEntityDto, 'id'>, tx?: any) {
    const row = await (tx ?? prisma).aIUsageEvent.create({
      data: {
        ...event,
        inputTokens: Number(event.totalInputTokens),
        totalInputTokens: undefined,
        clipId: event.clipId ?? null,
      },
    });
    return {
      ...row,
      totalInputTokens: BigInt(row.inputTokens),
    } as unknown as AIUsageEventEntityDto;
  }
}
