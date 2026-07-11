import { describe, expect, it } from 'vitest';
import { transcriptEntityToRecord, transcriptRecordToEntity } from './transcript.converter';

const entity = { id: 't', projectId: 'p', sourceAssetId: 's', backend: 'FAKE' as const, model: 'fixture', modelRevision: 'v1', weightsSha256: null, languageTag: 'es', objectBucket: 'clip-factory', objectKey: 'x.v1.json', objectVersionId: 'v1', objectSha256: 'a'.repeat(64), durationMs: 1, wordCount: 1, runtimeMs: 2, createdAt: new Date(0) };
describe('transcript mapping', () => it('round trips provenance without casts', () => expect(transcriptRecordToEntity({ ...transcriptEntityToRecord(entity), id: entity.id, createdAt: entity.createdAt })).toEqual(entity)));
