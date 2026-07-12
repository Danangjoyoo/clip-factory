import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadProjectFile } from './upload-api.client';

afterEach(() => vi.unstubAllGlobals());

describe('uploadProjectFile', () => {
  it('starts, uploads presigned parts, completes before resolving', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessionId: 'session-1' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            parts: [{ partNumber: 1, url: 'https://upload.test/1' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, { headers: { etag: 'etag-1' } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await uploadProjectFile(
      'project-1',
      'source-1',
      new File(['video'], 'branding.mp4', { type: 'video/mp4' }),
    );

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/projects/project-1/uploads',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'https://upload.test/1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      '/api/projects/project-1/uploads/session-1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects when presigned upload lacks an ETag', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessionId: 'session-1' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            parts: [{ partNumber: 1, url: 'https://upload.test/1' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    await expect(
      uploadProjectFile(
        'project-1',
        'source-1',
        new File(['video'], 'branding.mp4', { type: 'video/mp4' }),
      ),
    ).rejects.toThrow('UPLOAD_FAILED');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
