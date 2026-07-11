import { expect, it, vi } from 'vitest';
import { ProjectDataService } from './project.data-service';
it('delegates each project operation to its repository', async () => {
  const repository = {
    insert: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  };
  const service = new ProjectDataService(repository);
  await service.create({} as never, {});
  await service.get('p1');
  await service.list();
  await service.delete('p1', {});
  expect(repository.insert).toHaveBeenCalled();
  expect(repository.findById).toHaveBeenCalledWith('p1');
  expect(repository.list).toHaveBeenCalled();
  expect(repository.delete).toHaveBeenCalledWith('p1', {});
});
