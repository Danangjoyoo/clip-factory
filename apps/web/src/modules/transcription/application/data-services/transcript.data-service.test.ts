import { describe, expect, it, vi } from 'vitest';
import { TranscriptDataService } from './transcript.data-service';
describe('TranscriptDataService', () => it('delegates repository writes', async () => { const input = {} as never; const repository = { insert: vi.fn().mockResolvedValue(input), findByProjectId: vi.fn() }; await expect(new TranscriptDataService(repository).insert(input)).resolves.toBe(input); expect(repository.insert).toHaveBeenCalledWith(input); }));
