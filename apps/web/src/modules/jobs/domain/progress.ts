export type ProgressState = string;
export type EtaConfidence = 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_APPLICABLE';
export interface EtaRange {
  lowSeconds: number | null;
  highSeconds: number | null;
  confidence: EtaConfidence;
}
export interface EtaInput {
  state: ProgressState;
  completed: bigint;
  total: bigint;
  elapsedSeconds: number;
  historicalThroughputs: number[];
}
export class ProgressError extends Error {}

export function progressBasisPoints(completed: bigint, total: bigint): number {
  if (completed < 0n || total <= 0n || completed > total)
    throw new ProgressError('INVALID_WORK_UNITS');
  return Number((completed * 10000n) / total);
}

export function estimateEta(input: EtaInput): EtaRange {
  if (
    ['AWAITING_BUDGET', 'PAID_CALL_UNCERTAIN', 'AWAITING_REVIEW'].includes(
      input.state,
    )
  )
    return {
      lowSeconds: null,
      highSeconds: null,
      confidence: 'NOT_APPLICABLE',
    };
  const remaining = Number(input.total - input.completed);
  const current =
    input.completed > 0n && input.elapsedSeconds > 0
      ? Number(input.completed) / input.elapsedSeconds
      : 0;
  const rates = input.historicalThroughputs
    .filter((rate) => rate > 0)
    .sort((a, b) => a - b);
  if (rates.length < 5) {
    if (current <= 0)
      return { lowSeconds: null, highSeconds: null, confidence: 'LOW' };
    const center = remaining / current;
    return {
      lowSeconds: Math.ceil(center * 0.8),
      highSeconds: Math.ceil(center * 1.5),
      confidence: 'LOW',
    };
  }
  const p25 = rates[Math.floor((rates.length - 1) * 0.25)]!;
  const p75 = rates[Math.floor((rates.length - 1) * 0.75)]!;
  return {
    lowSeconds: Math.ceil(remaining / p75),
    highSeconds: Math.ceil(remaining / p25),
    confidence: rates.length >= 20 ? 'HIGH' : 'MEDIUM',
  };
}

export interface ProgressCalculationInput extends EtaInput {
  projectId: string;
  workflowId: string;
  stage: string;
  completedUnits: number;
  totalUnits: number;
  unit: string;
  occurredAt?: string;
}
export interface ProgressPresentation {
  projectId: string;
  workflowId: string;
  stage: string;
  progressBasisPoints: number;
  eta: EtaRange;
  completedUnits: number;
  totalUnits: number;
  unit: string;
  occurredAt: string;
}
export function calculateProgress(
  input: ProgressCalculationInput,
): ProgressPresentation {
  const completed = BigInt(input.completedUnits),
    total = BigInt(input.totalUnits);
  return {
    projectId: input.projectId,
    workflowId: input.workflowId,
    stage: input.stage,
    progressBasisPoints: progressBasisPoints(completed, total),
    eta: estimateEta({ ...input, completed, total }),
    completedUnits: input.completedUnits,
    totalUnits: input.totalUnits,
    unit: input.unit,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}
