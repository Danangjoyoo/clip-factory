export type PaidCallCrashMode =
  | 'AFTER_CALLBACK_COMMIT_BEFORE_ACK'
  | 'AFTER_SEND_BEFORE_DURABLE_RESPONSE';

export type FakeHighlightRequest = {
  transcript: string;
  instruction: string;
  mediaPath?: string;
};

export type FakeHighlightResponse = {
  responseId: string;
  model: 'fake-highlights-v1';
  pricingVersion: 'fake-2026-01';
  usage: { inputTokens: number; outputTokens: number };
  candidates: Array<{
    rank: number;
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
};

type AuditRequest = Omit<FakeHighlightRequest, 'mediaPath'>;
type FakeState = { maxCandidates: number; paidCallCrash?: PaidCallCrashMode };

const candidates = [
  {
    rank: 1,
    startSeconds: 12,
    endSeconds: 42,
    text: 'The strongest opening insight.',
  },
  {
    rank: 2,
    startSeconds: 75,
    endSeconds: 112,
    text: 'A practical, memorable example.',
  },
  {
    rank: 3,
    startSeconds: 148,
    endSeconds: 184,
    text: 'A concise closing takeaway.',
  },
  {
    rank: 4,
    startSeconds: 205,
    endSeconds: 241,
    text: 'An additional useful explanation.',
  },
  {
    rank: 5,
    startSeconds: 268,
    endSeconds: 300,
    text: 'A final supporting detail.',
  },
] as const;

let state: FakeState = { maxCandidates: 3 };
let responseNumber = 0;
let requests: AuditRequest[] = [];

export const fakeControl = {
  reset() {
    state = { maxCandidates: 3 };
    responseNumber = 0;
    requests = [];
  },
  configure(next: Partial<FakeState>) {
    if (
      next.maxCandidates !== undefined &&
      (!Number.isInteger(next.maxCandidates) || next.maxCandidates < 0)
    ) {
      throw new Error('maxCandidates must be a non-negative integer');
    }
    state = { ...state, ...next };
  },
  state(): Readonly<FakeState> {
    return { ...state };
  },
  audit(): readonly AuditRequest[] {
    return requests.map((request) => ({ ...request }));
  },
  highlight(request: FakeHighlightRequest): FakeHighlightResponse {
    if (!request.transcript.trim() || !request.instruction.trim()) {
      throw new Error('transcript and instruction are required');
    }
    requests.push({
      transcript: request.transcript,
      instruction: request.instruction,
    });
    responseNumber += 1;
    return {
      responseId: `fake-response-${responseNumber}`,
      model: 'fake-highlights-v1',
      pricingVersion: 'fake-2026-01',
      usage: { inputTokens: 120, outputTokens: 80 },
      candidates: candidates
        .slice(0, state.maxCandidates)
        .map((candidate) => ({ ...candidate })),
    };
  },
};
