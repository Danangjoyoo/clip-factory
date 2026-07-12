import { expect, it } from 'vitest';

import {
  assertAcknowledgedReplacementAttempt,
  assertOrdinaryPreFinalRetry,
  assertPublicationTransition,
  assertReconciledRemoteVideo,
  PublicationState,
  publicationTransitions,
} from './publication-state';

it('allows only explicit publication transitions', () => {
  expect(() =>
    assertPublicationTransition(
      PublicationState.ReadyToUpload,
      PublicationState.Uploading,
    ),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(
      PublicationState.Uploading,
      PublicationState.YouTubeProcessing,
    ),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(
      PublicationState.Uploading,
      PublicationState.UploadOutcomeUncertain,
    ),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(
      PublicationState.UploadOutcomeUncertain,
      PublicationState.Uploading,
    ),
  ).toThrow(
    'invalid publication transition UPLOAD_OUTCOME_UNCERTAIN -> UPLOADING',
  );
  expect(() =>
    assertPublicationTransition(
      PublicationState.Failed,
      PublicationState.ReadyToUpload,
    ),
  ).toThrow('invalid publication transition FAILED -> READY_TO_UPLOAD');
  expect(() =>
    assertPublicationTransition(
      PublicationState.Cancelled,
      PublicationState.Uploading,
    ),
  ).toThrow('invalid publication transition CANCELLED -> UPLOADING');
  expect(() =>
    assertPublicationTransition(
      PublicationState.YouTubeProcessing,
      PublicationState.Scheduled,
    ),
  ).not.toThrow();
});

it('requires durable proof before retry or replacement', () => {
  const ordinary = {
    kind: 'PRE_FINAL_RETRY' as const,
    finalChunkDispatchStartedAt: null,
    outcomeUncertainAt: null,
    reconciliationCheckedAt: null,
    reconciliationResult: null,
    duplicateRiskAcknowledgedAt: null,
    youtubeVideoId: null,
    attemptNumber: 1,
    maxAttempts: 3,
  };
  expect(
    assertOrdinaryPreFinalRetry(PublicationState.Failed, ordinary),
  ).toEqual({ nextState: PublicationState.ReadyToUpload });
  expect(() =>
    assertOrdinaryPreFinalRetry(PublicationState.Failed, {
      ...ordinary,
      finalChunkDispatchStartedAt: new Date(),
    }),
  ).toThrow(
    'ordinary retry requires proof that final chunk was never dispatched',
  );
  expect(() =>
    assertOrdinaryPreFinalRetry(PublicationState.Uploading, ordinary),
  ).toThrow('ordinary retry requires FAILED pre-final publication');
  expect(() =>
    assertOrdinaryPreFinalRetry(PublicationState.Failed, {
      ...ordinary,
      attemptNumber: 3,
    }),
  ).toThrow('publication attempt limit reached');
  const replacement = {
    kind: 'ACKNOWLEDGED_REPLACEMENT' as const,
    finalChunkDispatchStartedAt: new Date('2026-07-11T00:00:00Z'),
    outcomeUncertainAt: new Date('2026-07-11T00:00:01Z'),
    reconciliationCheckedAt: new Date('2026-07-11T00:00:30Z'),
    reconciliationResult: 'NO_MATCH_FOUND' as const,
    duplicateRiskAcknowledgedAt: new Date('2026-07-11T00:01:00Z'),
    youtubeVideoId: null,
    attemptNumber: 1,
    maxAttempts: 3,
  };
  expect(
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      replacement,
    ),
  ).toEqual({ nextState: PublicationState.ReadyToUpload });
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      { ...replacement, reconciliationResult: 'VIDEO_FOUND' },
    ),
  ).toThrow(
    'replacement is forbidden when reconciliation found a remote video',
  );
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      { ...replacement, youtubeVideoId: 'found-without-result' },
    ),
  ).toThrow(
    'replacement is forbidden when reconciliation found a remote video',
  );
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      { ...replacement, duplicateRiskAcknowledgedAt: null },
    ),
  ).toThrow('replacement requires durable duplicate-risk acknowledgement');
  expect(() =>
    assertAcknowledgedReplacementAttempt(PublicationState.Failed, replacement),
  ).toThrow('replacement requires UPLOAD_OUTCOME_UNCERTAIN');
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      {
        ...replacement,
        finalChunkDispatchStartedAt: new Date('2026-07-11T00:00:02Z'),
      },
    ),
  ).toThrow('replacement requires final-dispatch uncertainty evidence');
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      { ...replacement, reconciliationResult: 'INCONCLUSIVE' },
    ),
  ).not.toThrow();
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      {
        ...replacement,
        duplicateRiskAcknowledgedAt: new Date('2026-07-11T00:00:20Z'),
      },
    ),
  ).toThrow('replacement acknowledgement predates reconciliation');
  expect(() =>
    assertAcknowledgedReplacementAttempt(
      PublicationState.UploadOutcomeUncertain,
      { ...replacement, attemptNumber: 3 },
    ),
  ).toThrow('publication attempt limit reached');
});

it('permits processing only with reconciled remote video and freezes complete transition set', () => {
  expect(
    assertReconciledRemoteVideo(PublicationState.UploadOutcomeUncertain, {
      reconciliationResult: 'VIDEO_FOUND',
      youtubeVideoId: 'video-safe-1',
    }),
  ).toEqual({ nextState: PublicationState.YouTubeProcessing });
  expect(() =>
    assertReconciledRemoteVideo(PublicationState.UploadOutcomeUncertain, {
      reconciliationResult: 'INCONCLUSIVE',
      youtubeVideoId: null,
    }),
  ).toThrow('reconciled remote video requires VIDEO_FOUND and a video id');
  const transitions = publicationTransitions();
  expect(Object.keys(transitions).sort()).toEqual(
    Object.values(PublicationState).sort(),
  );
  expect(Object.isFrozen(transitions)).toBe(true);
  expect(Object.isFrozen(transitions[PublicationState.Uploading])).toBe(true);
});
