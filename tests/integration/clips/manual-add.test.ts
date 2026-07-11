import { describe, expect, it } from 'vitest';
import { manualClipHarness } from '../../../apps/web/src/modules/clips/testing/manual-clip-harness';
describe('manual clip integration', () => it('prepares a clip without an AI dependency', async () => { const h = manualClipHarness({ mode: 'MANUAL', sourceDurationMs: 1000, maximumClipSeconds: 1 }); const clip = await h.service.execute({ projectId: h.projectId, startTimecode: '00:00:00.100', endTimecode: '00:00:00.900' }); expect(clip.selectionCostMicrousd).toBe(0n); }));
