import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditorPage from './page';

vi.mock('../../../../modules/clips/composition/clip-views.composition', () => ({
  editorView: vi.fn().mockResolvedValue({
    projectId: 'project-1',
    clips: [
      {
        id: 'clip-1',
        title: 'Opening',
        startMs: 0,
        endMs: 30_000,
        sourceDurationMs: 60_000,
      },
    ],
    transcript: {
      text: 'Transcript text',
      downloadHref: '/api/projects/project-1/transcript',
    },
  }),
}));

describe('EditorPage', () => {
  it('renders the client editor wrapper without server event props', async () => {
    render(
      await EditorPage({
        params: Promise.resolve({ projectId: 'project-1' }),
      }),
    );

    expect(screen.getByRole('main', { name: 'Clip editor' })).toBeVisible();
    expect(screen.getByText('CANDIDATES')).toBeVisible();
  });
});
