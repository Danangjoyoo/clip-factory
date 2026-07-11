import { expect, it, vi } from 'vitest';
import { SourceAssetDataService } from './source-asset.data-service';
it('delegates each source operation to its repository', async () => {
  const repository = {
    insert: vi.fn(),
    findByProjectId: vi.fn(),
    findById: vi.fn(),
    applyValidatedLocator: vi.fn(),
    deleteByProjectId: vi.fn(),
  };
  const service = new SourceAssetDataService(repository);
  await service.create({} as never, {});
  await service.getByProjectId('p1');
  await service.deleteByProjectId('p1', {});
  expect(repository.insert).toHaveBeenCalled();
  expect(repository.findByProjectId).toHaveBeenCalledWith('p1');
  expect(repository.deleteByProjectId).toHaveBeenCalledWith('p1', {});
});
