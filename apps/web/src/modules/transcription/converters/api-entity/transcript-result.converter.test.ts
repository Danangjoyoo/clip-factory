import { expect, it } from 'vitest';
import { transcriptEntityToApi } from './transcript-result.converter';
it('serializes createdAt at the API boundary', () => expect(transcriptEntityToApi({ id: 't', projectId: 'p', sourceAssetId: 's', backend: 'FAKE', model: 'm', modelRevision: 'v', weightsSha256: null, languageTag: 'en', objectBucket: 'b', objectKey: 'k', objectVersionId: '1', objectSha256: 'a'.repeat(64), durationMs: 1, wordCount: 1, runtimeMs: 1, createdAt: new Date(0) }).createdAt).toBe('1970-01-01T00:00:00.000Z'));
