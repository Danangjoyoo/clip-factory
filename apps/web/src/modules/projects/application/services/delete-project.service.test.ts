import { expect, it, vi } from 'vitest';
import { DeleteProjectService } from './delete-project.service';
it('cancels, cleans artifacts, then deletes source before project', async () => {
  const calls: string[] = [];
  const projects = {
    get: vi.fn().mockResolvedValue({ id: 'p1', activeWorkflowId: 'w1' }),
    delete: vi.fn().mockImplementation(() => {
      calls.push('project');
    }),
  };
  const sources = {
    deleteByProjectId: vi.fn().mockImplementation(() => {
      calls.push('source');
    }),
  };
  const service = new DeleteProjectService(
    { execute: <T>(fn: (tx: unknown) => Promise<T>) => fn({}) },
    projects as never,
    sources as never,
    {
      cancel: vi.fn().mockImplementation(() => {
        calls.push('cancel');
      }),
    },
    {
      cleanupProject: vi.fn().mockImplementation(() => {
        calls.push('cleanup');
      }),
    },
  );
  expect(await service.execute('p1')).toBe(true);
  expect(calls).toEqual(['cancel', 'cleanup', 'source', 'project']);
});
