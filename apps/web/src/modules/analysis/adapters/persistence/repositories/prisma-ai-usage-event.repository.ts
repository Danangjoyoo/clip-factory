import { prisma } from '../../../../../infrastructure/prisma/client';
import type { $Enums } from '../../../../../generated/prisma/client';
import { aiUsageEventEntityToRecord, aiUsageEventRecordToEntity } from '../converters/ai-usage-event.converter';
import type { AIUsageEventEntityDto } from '../../../application/dto/entity';
import type { AIUsageEventRepository } from '../../../application/ports/ai-usage-event.repository';
import type { AnalysisTransaction } from '../../../application/ports/unit-of-work.port';
export class PrismaAIUsageEventRepository implements AIUsageEventRepository {
  async findByProviderResponseId(id: string, tx?: AnalysisTransaction) {
    const row = await (tx ?? prisma).aIUsageEvent.findUnique({
      where: { providerResponseId: id },
    });
    return row ? aiUsageEventRecordToEntity(row) : null;
  }
  async insert(event: Omit<AIUsageEventEntityDto, 'id'>, tx?: AnalysisTransaction) {
    const record = aiUsageEventEntityToRecord(event);
    const row = await (tx ?? prisma).aIUsageEvent.create({
      data: {
        projectId: record.projectId,
        analysisRunId: record.analysisRunId,
        clipId: record.clipId,
        providerResponseId: record.providerResponseId,
        requestHash: record.requestHash,
        purpose: record.purpose,
        modelId: record.modelId,
        reasoning: record.reasoning as $Enums.ReasoningRecord,
        promptVersion: record.promptVersion,
        schemaVersion: record.schemaVersion,
        pricingVersion: record.pricingVersion,
        inputTokens: Number(record.inputTokens),
        cachedInputTokens: Number(record.cachedInputTokens),
        cacheWriteInputTokens: Number(record.cacheWriteInputTokens),
        outputTokens: Number(record.outputTokens),
        reasoningTokens: Number(record.reasoningTokens),
        pricingTier: record.pricingTier,
        costMicrousd: record.costMicrousd,
        occurredAt: record.occurredAt,
      },
    });
    return aiUsageEventRecordToEntity(row);
  }
}
