import { expect, it } from 'vitest';
import {
  PublicationAttemptStage,
  PublicationState,
  PublicationVisibility,
  type PublicationAttemptEntityDto,
  type PublicationEntityDto,
} from '../dto/entity/youtube-publishing-entity.dto';
import { PublicationAttemptDataService } from './publication-attempt.data-service';
import { PublicationDataService } from './publication.data-service';

const metadata = {
  title: 'Title',
  description: '',
  hashtags: [],
  keywordTags: [],
  categoryId: '22',
  defaultLanguage: 'en',
  madeForKids: false,
  containsSyntheticMedia: false,
} as const;

const makePublicationEntity = (
  overrides: Partial<PublicationEntityDto> = {},
): PublicationEntityDto => ({
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60' as never,
  projectId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb50' as never,
  clipId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb51' as never,
  renderId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52' as never,
  connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb53' as never,
  metadataDraftId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54' as never,
  workflowId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb55' as never,
  intentKey: 'clip-1-primary-upload-1',
  idempotencyKey: 'publish:clip-1:primary:1',
  metadataSnapshot: metadata,
  visibility: PublicationVisibility.PrivateReview,
  apiProjectVerifiedSnapshot: false,
  schedule: null,
  state: PublicationState.ReadyToUpload,
  youtubeVideoId: null,
  youtubeUrl: null,
  remoteVideoCreatedAt: null,
  thumbnailWarningCode: null,
  sanitizedErrorCode: null,
  sanitizedErrorMessage: null,
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  ...overrides,
});

const makePublicationAttemptEntity = (
  overrides: Partial<PublicationAttemptEntityDto> = {},
): PublicationAttemptEntityDto => ({
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb70' as never,
  publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60' as never,
  attemptNumber: 1,
  idempotencyKey: 'attempt:clip-1:1',
  resumableSessionReference: null,
  acknowledgedBytes: 0n,
  totalBytes: 1_000n,
  stage: PublicationAttemptStage.Starting,
  progressPercent: 0,
  finalChunkDispatchStartedAt: null,
  outcomeUncertainAt: null,
  reconciliationCheckedAt: null,
  reconciliationResult: null,
  duplicateRiskAcknowledgedAt: null,
  sanitizedErrorCode: null,
  sanitizedErrorMessage: null,
  startedAt: new Date('2026-07-12T00:00:00.000Z'),
  completedAt: null,
  updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  ...overrides,
});

it('publication data service returns the existing idempotent row', async () => {
  const service = new PublicationDataService({
    findByIdempotencyKey: async () => makePublicationEntity(),
  } as never);
  await expect(
    service.findByIdempotencyKey('publish:clip-1:primary:1'),
  ).resolves.toMatchObject({ idempotencyKey: 'publish:clip-1:primary:1' });
});

it('attempt data service does not decrease acknowledged progress', async () => {
  const service = new PublicationAttemptDataService({
    saveProgress: async () =>
      makePublicationAttemptEntity({
        acknowledgedBytes: 700n,
        totalBytes: 1_000n,
        progressPercent: 70,
      }),
  } as never);
  await expect(
    service.saveProgress({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb70' as never,
      acknowledgedBytes: 600n,
      totalBytes: 1_000n,
      progressPercent: 60,
      stage: PublicationAttemptStage.Uploading,
      updatedAt: new Date('2026-07-12T00:00:01.000Z'),
    }),
  ).resolves.toMatchObject({ acknowledgedBytes: 700n, progressPercent: 70 });
});
