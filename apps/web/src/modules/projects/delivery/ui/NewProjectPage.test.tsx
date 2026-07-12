import { describe, expect, it } from 'vitest';
import { toCreateProjectRequest } from './NewProjectPage';

describe('toCreateProjectRequest', () => {
  it('keeps only create API fields', () => {
    const value = {
      name: 'Branding',
      sourceMethod: 'FILEPATH' as const,
      path: '/videos/branding.mp4',
      file: null,
      aiMode: 'PARTIAL' as const,
      language: 'en',
      model: 'gpt-5.6-sol' as const,
      reasoning: 'high',
      maximumSpendUsd: '8.00',
      maximumClips: 8,
      maximumClipSeconds: 75,
      instruction: 'Find the clearest hooks',
      platform: 'YOUTUBE_SHORTS',
    };

    expect(toCreateProjectRequest(value)).toEqual({
      name: 'Branding',
      mode: 'AI_HIGHLIGHTS',
      language: 'en',
      maxClipSeconds: 75,
      platform: 'YOUTUBE_SHORTS',
      source: { type: 'FILEPATH', path: '/videos/branding.mp4' },
    });
  });

  it('requires a selected upload file', () => {
    expect(() =>
      toCreateProjectRequest({
        name: 'Branding',
        sourceMethod: 'UPLOAD',
        path: '',
        file: null,
        aiMode: 'MANUAL',
        language: 'en',
        model: 'gpt-5.6-sol',
        reasoning: 'none',
        maximumSpendUsd: '0.00',
        maximumClips: 1,
        maximumClipSeconds: 60,
        instruction: '',
        platform: 'YOUTUBE_SHORTS',
      }),
    ).toThrow('Select a video file');
  });
});
