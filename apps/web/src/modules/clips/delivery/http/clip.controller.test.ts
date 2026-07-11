import { describe, expect, it, vi } from 'vitest';
import { ClipController } from './clip.controller';
describe('ClipController', () => it('rejects malformed range', async () => { const response = await new ClipController({ execute: vi.fn() } as never).post(new Request('http://test', { method: 'POST', body: '{}' }), 'p'); expect(response.status).toBe(422); }));
