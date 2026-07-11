import { describe, expect, it } from 'vitest';
import {
  getModel,
  getPlatformPreset,
  getPricing,
  listCompatibleModels,
  supportsReasoning,
} from './catalog';

describe('versioned catalogs', () => {
  it('pins models and supported reasoning', () => {
    expect(getModel('gpt-5.6-sol')).toMatchObject({
      defaultReasoning: 'high',
      catalogVersion: '2026-07-11.1',
    });
    expect(
      getModel('gpt-5.6-sol').reasoning.map((item) => item.effort),
    ).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    expect(getModel('gpt-5.5').reasoning.map((item) => item.effort)).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
    expect(listCompatibleModels().map((item) => item.id)).toEqual([
      'gpt-5.6-sol',
      'gpt-5.5',
    ]);
    expect(supportsReasoning('gpt-5.6-sol', 'high')).toBe(true);
    expect(supportsReasoning('gpt-5.5', 'max')).toBe(false);
    expect(
      getPricing('gpt-5.5', 'openai-2026-07-11.1').outputMicrousdPerMillion,
    ).toBe(30000000);
  });
  it('defines platform safe areas', () => {
    expect(getPlatformPreset('YOUTUBE_SHORTS').safeArea).toEqual({
      top: 0.08,
      right: 0.06,
      bottom: 0.2,
      left: 0.06,
    });
    expect(getPlatformPreset('INSTAGRAM_REELS').canvas).toEqual({
      width: 1080,
      height: 1920,
    });
  });
});
