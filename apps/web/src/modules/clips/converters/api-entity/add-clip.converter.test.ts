import { expect, it } from 'vitest';
import { addClipApiToEntity } from './add-clip.converter';
it('converts strict API bounds', () => expect(addClipApiToEntity('p', { start: '00:00:01.000', end: '00:00:02.000' }, 'k')).toEqual({ projectId: 'p', startTimecode: '00:00:01.000', endTimecode: '00:00:02.000', idempotencyKey: 'k' }));
