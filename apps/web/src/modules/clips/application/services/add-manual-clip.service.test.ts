import { describe, expect, it } from 'vitest';
import { manualClipHarness } from '../../testing/manual-clip-harness';
describe('AddManualClipService', () => {
  it.each(['MANUAL', 'AI_HIGHLIGHTS'] as const)('creates a zero-cost local clip in %s mode', async (mode) => {
    const h = manualClipHarness({ mode, sourceDurationMs: 120000, maximumClipSeconds: 60 });
    const result = await h.service.execute({ projectId: h.projectId, startTimecode: '00:00:10.000', endTimecode: '00:00:40.000' });
    expect(result).toMatchObject({ origin: 'MANUAL', startMs: 10000, endMs: 40000, analysisRunId: null, selectionCostMicrousd: 0n });
    expect(result.captionDocument.cues.flatMap((cue) => cue.words).map((word) => word.text)).toEqual(['first', 'complete', 'thought']);
    expect(h.preparation.calls).toEqual([{ projectWorkflowId: 'workflow', clipId: result.id, startMs: 10000, endMs: 40000 }]);
    expect(Object.keys(h.dependencies)).not.toContain('openAI');
  });
  it('rejects reversed bounds before creating or preparing', async () => { const h = manualClipHarness({ mode: 'MANUAL', sourceDurationMs: 120000, maximumClipSeconds: 60 }); await expect(h.service.execute({ projectId: h.projectId, startTimecode: '00:00:40.000', endTimecode: '00:00:10.000' })).rejects.toThrow('CLIP_END_NOT_AFTER_START'); expect(h.preparation.calls).toHaveLength(0); });
});
