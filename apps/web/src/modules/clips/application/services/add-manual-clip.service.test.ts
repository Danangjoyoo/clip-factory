import { describe, expect, it } from 'vitest';
import { AddManualClipService } from './add-manual-clip.service';
import { manualClipHarness } from '../../testing/manual-clip-harness';

describe('AddManualClipService', () => {
  it.each(['MANUAL', 'AI_HIGHLIGHTS'] as const)('adds a zero-cost manual clip to %s project', async (mode) => {
    const h = manualClipHarness({ mode, sourceDurationMs: 120000, maximumClipSeconds: 60 });
    const result = await h.service.execute({ projectId: h.projectId, startTimecode: '00:00:10.000', endTimecode: '00:00:40.000' });
    expect(result).toMatchObject({ origin: 'MANUAL', startMs: 10000, endMs: 40000, analysisRunId: null, rank: null, score: null, selectionCostMicrousd: 0n });
    expect(result.captionDocument.cues.flatMap((cue) => cue.words).map((word) => word.text)).toEqual(['first', 'complete', 'thought']);
    expect(h.preparation.calls).toEqual([{ clipId: result.id, startMs: 10000, endMs: 40000 }]);
    expect(Object.keys(h.dependencies)).not.toContain('openAI');
  });
});
