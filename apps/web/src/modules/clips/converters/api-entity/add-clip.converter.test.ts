import { describe, expect, it } from 'vitest';
import { addClipApiToEntity } from './add-clip.converter';
describe('manual clip API converter', () =>
  it('maps range and idempotency key', () =>
    expect(
      addClipApiToEntity(
        'p',
        { start: '00:00:01.000', end: '00:00:02.000' },
        'k',
      ),
    ).toEqual({
      projectId: 'p',
      startTimecode: '00:00:01.000',
      endTimecode: '00:00:02.000',
      idempotencyKey: 'k',
    })));
