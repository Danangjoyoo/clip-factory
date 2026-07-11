import { describe, expect, it } from 'vitest';

import { CreateArchiveError, CreateArchiveService } from '../../application/services/create-archive.service';
import { ArchiveController } from './archive.controller';

const serviceWithSuccess = {
  async execute() {
    return { archiveKey: 'projects/project-1/archives/archive-1.zip' };
  },
} as unknown as CreateArchiveService;

const serviceWithNoRender = {
  async execute() {
    throw new CreateArchiveError('NO_SUCCESSFUL_RENDERS');
  },
} as unknown as CreateArchiveService;

const serviceWithBadRequest = {
  async execute() {
    throw new Error('boom');
  },
} as unknown as CreateArchiveService;

it('creates archive from validated payload', async () => {
  const controller = new ArchiveController(serviceWithSuccess);
  const response = await controller.create('project-1', {
    archiveId: 'archive-1',
    renders: [
      {
        renderId: 'render-1',
        title: 'My Clip',
        sortOrder: 1,
        outputKey: 'videos/output.mp4',
        srtObjectKey: 'subs/output.srt',
      },
    ],
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    archiveKey: 'projects/project-1/archives/archive-1.zip',
  });
});

it('returns invalid request for malformed payload', async () => {
  const controller = new ArchiveController(serviceWithSuccess);
  const response = await controller.create('project-1', { archiveId: 'archive-1', renders: 'bad' });
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: 'INVALID_ARCHIVE_REQUEST' });
});

it('returns 409 when no successful renders are available', async () => {
  const controller = new ArchiveController(serviceWithNoRender);
  const response = await controller.create('project-1', {
    archiveId: 'archive-1',
    renders: [
      { renderId: 'render-1', title: 'x', sortOrder: 1, outputKey: 'videos/output.mp4' },
    ],
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: 'NO_SUCCESSFUL_RENDERS' });
});

describe('invalid render entry', () => {
  it('returns a 400 for invalid render input', async () => {
    const controller = new ArchiveController(serviceWithSuccess);
    const response = await controller.create('project-1', {
      archiveId: 'archive-1',
      renders: [{ renderId: 1, title: 'bad', sortOrder: 1, outputKey: 'videos/output.mp4' }],
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'INVALID_RENDER_ENTRY' });
  });
});
