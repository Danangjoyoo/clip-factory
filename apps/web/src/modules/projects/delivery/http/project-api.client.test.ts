import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject, listProjects } from './project-api.client';

afterEach(() => vi.unstubAllGlobals());

describe('project API client', () => {
  it('loads projects from public route', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ id: 'project-1' }]), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(listProjects()).resolves.toEqual([{ id: 'project-1' }]);
    expect(fetch).toHaveBeenCalledWith('/api/projects', { signal: undefined });
  });

  it('sends only supplied create payload and surfaces API error code', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_PROJECT' }), {
        status: 400,
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const input = {
      name: 'Branding',
      mode: 'MANUAL' as const,
      language: 'en',
      maxClipSeconds: 60,
      platform: 'YOUTUBE_SHORTS' as const,
      source: { type: 'FILEPATH' as const, path: '/videos/branding.mp4' },
    };

    await expect(createProject(input)).rejects.toThrow('INVALID_PROJECT');
    expect(fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    );
  });
});
