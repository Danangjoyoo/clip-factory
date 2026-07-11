
export type ProjectMode = 'AI_HIGHLIGHTS' | 'MANUAL';
export type ProjectStatus =
  | 'DRAFT'
  | 'VALIDATING_SOURCE'
  | 'UPLOADING'
  | 'QUEUED'
  | 'PREPROCESSING'
  | 'TRANSCRIBING'
  | 'VERIFYING_BUDGET'
  | 'AWAITING_BUDGET'
  | 'ANALYZING'
  | 'PAID_CALL_UNCERTAIN'
  | 'GENERATING_PREVIEWS'
  | 'AWAITING_REVIEW'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SOURCE_MISSING'
  | 'SOURCE_CHANGED'
  | 'SOURCE_NOT_ALLOWED'
  | 'RELINKING_SOURCE'
  | string;
export type ProjectSourceHealth =
  | 'UNKNOWN'
  | 'LOCATED'
  | 'HEALTHY'
  | 'MISSING'
  | 'CHANGED'
  | 'NOT_ALLOWED'
  | 'INVALID'
  | string;

export type ProjectApi = Readonly<{
  id: string;
  name: string;
  mode: ProjectMode;
  status: ProjectStatus;
  openaiSpendMicrousd: string | number;
  updatedAt: string;
  etaLabel?: string | null;
  source?: {
    health: ProjectSourceHealth;
    kind?: string;
    displayLabel?: string;
  } | null;
  candidateCount?: number | null;
  renderCount?: number | null;
}>;

type Tone = 'neutral' | 'warning' | 'danger';
export type ProjectCardView = Readonly<{
  id: string;
  name: string;
  href: string;
  sourceHealthLabel: string;
  sourceHealthTone: Tone;
  modeLabel: string;
  progressLabel: string;
  etaLabel: string | null;
  candidateCount: number;
  renderCount: number;
  spendLabel: string;
  updatedLabel: string;
}>;

const SOURCE_HEALTH_LABEL: Record<string, string> = {
  UNKNOWN: 'Source unknown',
  LOCATED: 'Source located',
  HEALTHY: 'Source healthy',
  MISSING: 'Source missing',
  CHANGED: 'Source changed',
  NOT_ALLOWED: 'Source blocked',
  INVALID: 'Source invalid',
};

const SOURCE_HEALTH_TONE: Record<string, Tone> = {
  UNKNOWN: 'neutral',
  LOCATED: 'neutral',
  HEALTHY: 'neutral',
  MISSING: 'danger',
  CHANGED: 'warning',
  NOT_ALLOWED: 'danger',
  INVALID: 'danger',
};

const STATUS_PROGRESS: Record<string, string> = {
  DRAFT: 'Draft',
  VALIDATING_SOURCE: 'Validating source',
  UPLOADING: 'Uploading',
  QUEUED: 'Queued',
  PREPROCESSING: 'Preprocessing',
  TRANSCRIBING: 'Transcribing',
  VERIFYING_BUDGET: 'Verifying budget',
  AWAITING_BUDGET: 'Awaiting budget',
  ANALYZING: 'Analyzing',
  PAID_CALL_UNCERTAIN: 'Awaiting AI confirmation',
  GENERATING_PREVIEWS: 'Generating clip previews',
  AWAITING_REVIEW: 'Waiting for review',
  RENDERING: 'Rendering',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  SOURCE_MISSING: 'Source missing',
  SOURCE_CHANGED: 'Source changed',
  SOURCE_NOT_ALLOWED: 'Source blocked',
  RELINKING_SOURCE: 'Relinking source',
};

const MODE_LABEL: Record<ProjectMode, string> = {
  AI_HIGHLIGHTS: 'AI Highlights',
  MANUAL: 'Manual — No cloud AI / no API cost',
};

const WAITING_STATUSES_WITHOUT_ETA = new Set<ProjectStatus>([
  'DRAFT',
  'SOURCE_MISSING',
  'SOURCE_CHANGED',
  'SOURCE_NOT_ALLOWED',
  'RELINKING_SOURCE',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

const formatMoney = (microUsd: string | number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(BigInt(String(microUsd))) / 1_000_000);

const formatUpdated = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const toneForHealth = (health: string): Tone =>
  SOURCE_HEALTH_TONE[health] ?? 'neutral';
const labelForHealth = (health: string): string =>
  SOURCE_HEALTH_LABEL[health] ?? `Source ${health.toLowerCase()}`;

export const projectApiToCardView = (
  value: ProjectApi,
): ProjectCardView => {
  const sourceHealth = value.source?.health ?? 'UNKNOWN';
  const status = value.status as ProjectStatus;
  return {
    id: value.id,
    name: value.name,
    href: `/projects/${value.id}`,
    sourceHealthLabel: labelForHealth(sourceHealth),
    sourceHealthTone: toneForHealth(sourceHealth),
    modeLabel: MODE_LABEL[(value.mode as ProjectMode) ?? 'MANUAL'],
    progressLabel: STATUS_PROGRESS[status] ?? 'Processing',
    etaLabel: WAITING_STATUSES_WITHOUT_ETA.has(status)
      ? null
      : value.etaLabel ?? null,
    candidateCount: Math.max(0, value.candidateCount ?? 0),
    renderCount: Math.max(0, value.renderCount ?? 0),
    spendLabel: formatMoney(value.openaiSpendMicrousd),
    updatedLabel: formatUpdated(value.updatedAt),
  };
};

// Backward-compatible alias for earlier references.
export const projectApiToView = projectApiToCardView;
