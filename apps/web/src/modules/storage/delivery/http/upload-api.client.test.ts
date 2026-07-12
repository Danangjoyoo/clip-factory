import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadProjectFile } from './upload-api.client';

afterEach(() => vi.unstubAllGlobals());

const file = () => {
  const bytes = new TextEncoder().encode('video');
  return {
    name: 'branding.mp4',
    size: bytes.byteLength,
    type: 'video/mp4',
    arrayBuffer: async () => bytes.buffer,
    slice: () => new Blob([bytes], { type: 'video/mp4' }),
  } as unknown as File;
};

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

    await uploadProjectFile('project-1', 'source-1', file());

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
    const completion = fetch.mock.calls[3]?.[1] as RequestInit;
    expect(JSON.parse(String(completion.body))).toMatchObject({
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
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
      uploadProjectFile('project-1', 'source-1', file()),
    ).rejects.toThrow('UPLOAD_FAILED');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
