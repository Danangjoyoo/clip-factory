import { describe, expect, it } from 'vitest';
import { projectApiToCard } from './ProjectLibraryPage';

describe('projectApiToCard', () => {
  it('maps API fields without inventing clip or render totals', () => {
    expect(
      projectApiToCard({
        id: 'project-1',
        name: 'Branding',
        mode: 'AI_HIGHLIGHTS',
        language: 'en',
        maxClipSeconds: 60,
        platform: 'YOUTUBE_SHORTS',
        status: 'TRANSCRIBING',
        openaiSpendMicrousd: '1250000',
        source: {
          id: 'source-1',
          kind: 'LOCAL_FILE',
          displayLabel: 'branding.mp4',
          health: 'HEALTHY',
        },
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      }),
    ).toMatchObject({
      href: '/projects/project-1/processing',
      sourceHealthLabel: 'Healthy · branding.mp4',
      modeLabel: 'AI highlights',
      progressLabel: 'Transcribing',
      candidateCount: null,
      renderCount: null,
      spendLabel: '$1.25',
    });
  });
});
