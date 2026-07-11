import { expect, it, vi } from 'vitest';
import { ProjectController } from './project.controller';
const project = {
  id: 'p1',
  name: 'Demo',
  mode: 'MANUAL',
  languageTag: 'en',
  defaultMaxClipSeconds: 60,
  defaultPlatformPreset: 'TIKTOK',
  status: 'DRAFT',
  activeWorkflowId: null,
  openaiSpendMicrousd: 0n,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;
it('returns 400 only for transport validation and lets persistence errors reject', async () => {
  const create = vi.fn().mockRejectedValue(new Error('db down'));
  const controller = new ProjectController(
    { execute: create } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
  );
  const invalid = await controller.create(
    new Request('http://localhost', { method: 'POST', body: '{}' }),
  );
  expect(invalid.status).toBe(400);
  await expect(
    controller.create(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Demo',
          mode: 'MANUAL',
          language: 'en',
          maxClipSeconds: 60,
          platform: 'TIKTOK',
          source: { type: 'FILEPATH', path: '/tmp/a.mov' },
        }),
      }),
    ),
  ).rejects.toThrow('db down');
});
it('serializes a created project with string micro-USD', async () => {
  const controller = new ProjectController(
    { execute: vi.fn().mockResolvedValue({ project, source: null }) } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const response = await controller.create(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Demo',
        mode: 'MANUAL',
        language: 'en',
        maxClipSeconds: 60,
        platform: 'TIKTOK',
        source: { type: 'FILEPATH', path: '/tmp/a.mov' },
      }),
    }),
  );
  expect(response.status).toBe(201);
  expect((await response.json()).openaiSpendMicrousd).toBe('0');
});
