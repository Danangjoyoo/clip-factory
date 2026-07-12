import { describe, expect, it } from 'vitest';

import {
  parseOAuthConnectionWorkflowInputV1,
  parsePublicationProgressEventV1,
  parsePublicationWorkflowInputV1,
} from './youtube-publishing';

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
] as const;

describe('YouTube publishing Temporal contract', () => {
  it('accepts exact two scopes and opaque connection id', () => {
    expect(
      parseOAuthConnectionWorkflowInputV1({
        contractVersion: 1,
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        requestedScopes: scopes,
      }),
    ).toMatchObject({ contractVersion: 1, requestedScopes: scopes });
  });

  it.each([
    'accessToken',
    'refreshToken',
    'authorizationCode',
    'codeVerifier',
    'clientSecret',
  ])('rejects credential property %s', (credentialProperty) => {
    expect(() =>
      parseOAuthConnectionWorkflowInputV1({
        contractVersion: 1,
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        requestedScopes: scopes,
        [credentialProperty]: 'sentinel-secret',
      }),
    ).toThrow();
  });

  it('rejects scheduled publication when timezone or UTC instant absent', () => {
    expect(() =>
      parsePublicationWorkflowInputV1({
        contractVersion: 1,
        publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb43',
        attemptId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb44',
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        clipId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb45',
        renderId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb46',
        renderObject: {
          bucket: 'clip-factory',
          key: 'renders/clip-1/final.mp4',
          versionId: 'render-version-1',
          sha256: 'a'.repeat(64),
        },
        coverObject: null,
        totalBytes: 1048576,
        metadataSnapshot: {
          title: 'A concise title',
          description: 'A reviewed description',
          hashtags: ['#ClipFactory'],
          keywordTags: ['clip factory'],
          categoryId: '22',
          defaultLanguage: 'en',
          madeForKids: false,
          containsSyntheticMedia: false,
        },
        visibility: 'SCHEDULED',
        scheduleAtUtc: null,
        sourceTimezone: null,
        apiProjectVerified: true,
      }),
    ).toThrow(
      'scheduled publication requires scheduleAtUtc and sourceTimezone',
    );
  });

  it('accepts only canonical upload uncertainty action', () => {
    expect(() =>
      parsePublicationProgressEventV1({
        contractVersion: 1,
        type: 'UPLOAD_OUTCOME_UNCERTAIN',
        publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb43',
        attemptId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb44',
        finalChunkDispatchedAt: '2026-07-11T01:00:00Z',
        safeReasonCode: 'FINAL_UPLOAD_RESULT_UNKNOWN',
        requiredAction: 'CREATE_REPLACEMENT_NOW',
      }),
    ).toThrow();
  });
});
