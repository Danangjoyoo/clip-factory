import { describe, expect, it } from 'vitest';
import { clipRecordToEntity } from './clip.converter';
describe('clip persistence converter', () => it('derives zero selection cost for manual clips', () => expect(clipRecordToEntity({ id: 'c', projectId: 'p', analysisRunId: null, origin: 'MANUAL', startMs: 1, endMs: 2, title: null, rank: null, scoreJson: null, captionJson: { version: 1, languageTag: 'en', cues: [] }, styleJson: {}, frameJson: {}, state: 'CANDIDATE', createdAt: new Date(0), updatedAt: new Date(0) }).selectionCostMicrousd).toBe(0n)));
