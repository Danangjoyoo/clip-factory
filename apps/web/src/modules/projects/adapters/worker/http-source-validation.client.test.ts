import { describe, expect, it, vi } from 'vitest';
import { HttpSourceValidationClient } from './http-source-validation.client';

describe('HttpSourceValidationClient', () => {
  it('executes relink validation through the authenticated worker port', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          displayPath: 'video.mov',
          resolvedPath: '/safe/video.mov',
          sizeBytes: '3',
          modifiedAt: '2026-07-11T00:00:00.000Z',
          fingerprint: 'fp',
          probe: { width: 1 },
        }),
        { status: 200 },
      ),
    );
    const value = await new HttpSourceValidationClient(
      'http://worker/',
      'secret',
      request,
    ).validateCandidate({
      sourceAssetId: 'source',
      candidatePath: '/safe/video.mov',
    });
    expect(value).toMatchObject({
      resolvedPath: '/safe/video.mov',
      fingerprint: 'fp',
      sizeBytes: 3n,
    });
    expect(request).toHaveBeenCalledWith(
      'http://worker/internal/source-validation',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    );
  });
});
