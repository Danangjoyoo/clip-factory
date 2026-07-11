import { prisma } from '../../../../../infrastructure/prisma/client';
import type {
  UsageReport,
  UsageReportRow,
  UsageReportSource,
} from '../../../application/ports/usage-report.port';

const iso = (value: Date) => value.toISOString();
const micros = (value: bigint | number) => value.toString();

export class PrismaUsageReportRepository implements UsageReportSource {
  async report({
    pageSize,
  }: {
    cursor?: string;
    pageSize: number;
  }): Promise<UsageReport> {
    const [events, projects, runs, allocations, renders] = await Promise.all([
      prisma.aIUsageEvent.findMany({
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: pageSize,
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        select: {
          id: true,
          name: true,
          mode: true,
          createdAt: true,
          openaiSpendMicrousd: true,
        },
      }),
      prisma.analysisRun.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        select: {
          id: true,
          projectId: true,
          modelId: true,
          reasoning: true,
          status: true,
          actualMicrousd: true,
          uncertainReservedMicrousd: true,
          createdAt: true,
        },
      }),
      prisma.costAllocation.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        select: {
          id: true,
          analysisRunId: true,
          clipId: true,
          method: true,
          amountMicrousd: true,
          createdAt: true,
        },
      }),
      prisma.render.findMany({
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        select: {
          id: true,
          projectId: true,
          clipId: true,
          encoder: true,
          status: true,
          durationMs: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
        },
      }),
    ]);
    const apiCalls: UsageReportRow[] = events.map((e) => ({
      id: e.id,
      responseId: e.providerResponseId,
      projectId: e.projectId,
      analysisRunId: e.analysisRunId,
      purpose: e.purpose,
      modelId: e.modelId,
      reasoning: e.reasoning,
      inputTokens: e.inputTokens,
      cachedInputTokens: e.cachedInputTokens,
      outputTokens: e.outputTokens,
      reasoningTokens: e.reasoningTokens,
      pricingVersion: e.pricingVersion,
      pricingTier: e.pricingTier,
      costMicrousd: micros(e.costMicrousd),
      occurredAt: iso(e.occurredAt),
    }));
    const actual = events.reduce((sum, e) => sum + e.costMicrousd, 0n);
    const allocated = allocations.reduce(
      (sum, a) => sum + a.amountMicrousd,
      0n,
    );
    const possible = runs.reduce(
      (sum, r) => sum + r.uncertainReservedMicrousd,
      0n,
    );
    const report: UsageReport = {
      summary: {
        actual: `$${micros(actual)}`,
        allocated: `$${micros(allocated)} allocated estimate`,
        possible: `Up to $${micros(possible)} possible unreported provider charge`,
      },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        mode: p.mode,
        actualMicrousd: micros(p.openaiSpendMicrousd),
        createdAt: iso(p.createdAt),
      })),
      analysisRuns: runs.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        modelId: r.modelId,
        reasoning: r.reasoning,
        status: r.status,
        actualMicrousd: micros(r.actualMicrousd),
        uncertainMicrousd: micros(r.uncertainReservedMicrousd),
        createdAt: iso(r.createdAt),
      })),
      apiCalls,
      allocations: allocations.map((a) => ({
        id: a.id,
        analysisRunId: a.analysisRunId,
        clipId: a.clipId,
        method: a.method,
        amountMicrousd: micros(a.amountMicrousd),
        createdAt: iso(a.createdAt),
      })),
      renders: renders.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        clipId: r.clipId,
        encoder: r.encoder,
        status: r.status,
        durationMs: r.durationMs,
        startedAt: r.startedAt ? iso(r.startedAt) : null,
        finishedAt: r.finishedAt ? iso(r.finishedAt) : null,
        createdAt: iso(r.createdAt),
      })),
      models: [
        ...new Map(
          events.map((e) => [
            e.modelId,
            {
              id: e.modelId,
              modelId: e.modelId,
              pricingVersion: e.pricingVersion,
              pricingTier: e.pricingTier,
            },
          ]),
        ).values(),
      ],
    };
    return report;
  }
}
