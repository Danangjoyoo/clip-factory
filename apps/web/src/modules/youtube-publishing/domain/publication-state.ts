export const PublicationState = {
  ReadyToUpload: 'READY_TO_UPLOAD',
  Uploading: 'UPLOADING',
  UploadOutcomeUncertain: 'UPLOAD_OUTCOME_UNCERTAIN',
  YouTubeProcessing: 'YOUTUBE_PROCESSING',
  PrivateReview: 'PRIVATE_REVIEW',
  Scheduled: 'SCHEDULED',
  Published: 'PUBLISHED',
  Failed: 'FAILED',
  Cancelled: 'CANCELLED',
} as const;

export type PublicationState =
  (typeof PublicationState)[keyof typeof PublicationState];

const allowed: Readonly<
  Record<PublicationState, ReadonlySet<PublicationState>>
> = {
  [PublicationState.ReadyToUpload]: new Set([
    PublicationState.Uploading,
    PublicationState.Cancelled,
  ]),
  [PublicationState.Uploading]: new Set([
    PublicationState.UploadOutcomeUncertain,
    PublicationState.YouTubeProcessing,
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.UploadOutcomeUncertain]: new Set([
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.YouTubeProcessing]: new Set([
    PublicationState.PrivateReview,
    PublicationState.Scheduled,
    PublicationState.Published,
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.PrivateReview]: new Set([
    PublicationState.Published,
    PublicationState.Failed,
  ]),
  [PublicationState.Scheduled]: new Set([
    PublicationState.Published,
    PublicationState.Failed,
  ]),
  [PublicationState.Published]: new Set(),
  [PublicationState.Failed]: new Set([PublicationState.Cancelled]),
  [PublicationState.Cancelled]: new Set(),
};

export function assertPublicationTransition(
  current: PublicationState,
  next: PublicationState,
): void {
  if (!allowed[current].has(next))
    throw new Error(`invalid publication transition ${current} -> ${next}`);
}

export type OrdinaryPreFinalRetryEvidence = {
  kind: 'PRE_FINAL_RETRY';
  finalChunkDispatchStartedAt: Date | null;
  outcomeUncertainAt: Date | null;
  reconciliationCheckedAt: null;
  reconciliationResult: null;
  duplicateRiskAcknowledgedAt: null;
  youtubeVideoId: null;
  attemptNumber: number;
  maxAttempts: number;
};

export type AcknowledgedReplacementEvidence = {
  kind: 'ACKNOWLEDGED_REPLACEMENT';
  finalChunkDispatchStartedAt: Date;
  outcomeUncertainAt: Date;
  reconciliationCheckedAt: Date;
  reconciliationResult: 'NO_MATCH_FOUND' | 'INCONCLUSIVE' | 'VIDEO_FOUND';
  duplicateRiskAcknowledgedAt: Date | null;
  youtubeVideoId: string | null;
  attemptNumber: number;
  maxAttempts: number;
};

export function assertOrdinaryPreFinalRetry(
  current: PublicationState,
  evidence: OrdinaryPreFinalRetryEvidence,
): { nextState: typeof PublicationState.ReadyToUpload } {
  if (
    current !== PublicationState.Failed ||
    evidence.kind !== 'PRE_FINAL_RETRY'
  )
    throw new Error('ordinary retry requires FAILED pre-final publication');
  if (
    evidence.finalChunkDispatchStartedAt ||
    evidence.outcomeUncertainAt ||
    evidence.reconciliationCheckedAt ||
    evidence.reconciliationResult ||
    evidence.duplicateRiskAcknowledgedAt ||
    evidence.youtubeVideoId
  )
    throw new Error(
      'ordinary retry requires proof that final chunk was never dispatched',
    );
  if (evidence.attemptNumber >= evidence.maxAttempts)
    throw new Error('publication attempt limit reached');
  return { nextState: PublicationState.ReadyToUpload };
}

export function assertAcknowledgedReplacementAttempt(
  current: PublicationState,
  evidence: AcknowledgedReplacementEvidence,
): { nextState: typeof PublicationState.ReadyToUpload } {
  if (current !== PublicationState.UploadOutcomeUncertain)
    throw new Error('replacement requires UPLOAD_OUTCOME_UNCERTAIN');
  if (
    evidence.reconciliationResult === 'VIDEO_FOUND' ||
    evidence.youtubeVideoId !== null
  )
    throw new Error(
      'replacement is forbidden when reconciliation found a remote video',
    );
  if (evidence.finalChunkDispatchStartedAt > evidence.outcomeUncertainAt)
    throw new Error('replacement requires final-dispatch uncertainty evidence');
  if (evidence.duplicateRiskAcknowledgedAt === null)
    throw new Error(
      'replacement requires durable duplicate-risk acknowledgement',
    );
  if (evidence.duplicateRiskAcknowledgedAt < evidence.reconciliationCheckedAt)
    throw new Error('replacement acknowledgement predates reconciliation');
  if (evidence.attemptNumber >= evidence.maxAttempts)
    throw new Error('publication attempt limit reached');
  return { nextState: PublicationState.ReadyToUpload };
}

export function assertReconciledRemoteVideo(
  current: PublicationState,
  evidence: {
    reconciliationResult: 'VIDEO_FOUND' | 'NO_MATCH_FOUND' | 'INCONCLUSIVE';
    youtubeVideoId: string | null;
  },
): { nextState: typeof PublicationState.YouTubeProcessing } {
  if (
    current !== PublicationState.UploadOutcomeUncertain ||
    evidence.reconciliationResult !== 'VIDEO_FOUND' ||
    evidence.youtubeVideoId === null
  )
    throw new Error(
      'reconciled remote video requires VIDEO_FOUND and a video id',
    );
  return { nextState: PublicationState.YouTubeProcessing };
}

export function publicationTransitions(): Readonly<
  Record<PublicationState, readonly PublicationState[]>
> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(allowed).map(([state, targets]) => [
        state,
        Object.freeze([...targets]),
      ]),
    ) as Record<PublicationState, readonly PublicationState[]>,
  );
}
