import { describe, expect, it } from 'vitest';

import { GetDownloadError, GetDownloadService } from '../../application/services/get-download.service';
import { DownloadController } from './download.controller';

const baseRender = {
  url: 'https://media.local/video.mp4',
};

it('returns presigned URL on success', async () => {
  const controller = new DownloadController({
    execute: async () => baseRender,
  } as unknown as GetDownloadService);

  const response = await controller.get('render-1');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: 'https://media.local/video.mp4' });
});

it('maps missing render to 404', async () => {
  const controller = new DownloadController({
    execute: async () => {
      throw new GetDownloadError('RENDER_NOT_FOUND');
    },
  } as unknown as GetDownloadService);

  const response = await controller.get('missing');
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: 'RENDER_NOT_FOUND' });
});

it('maps non-ready states to 409', async () => {
  const controller = new DownloadController({
    execute: async () => {
      throw new GetDownloadError('OUTPUT_NOT_READY');
    },
  } as unknown as GetDownloadService);

  const response = await controller.get('render-2');
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: 'OUTPUT_NOT_READY' });
});

describe('DownloadController._status', () => {
  it('returns 400 for unknown app errors', async () => {
    const controller = new DownloadController({
      execute: async () => {
        throw new GetDownloadError('UNKNOWN');
      },
    } as unknown as GetDownloadService);
    const response = await controller.get('render-3');
    expect(response.status).toBe(400);
  });
});
