import { randomUUID } from 'node:crypto';
import type { ProjectRepository } from '../application/ports/project.repository';
import type { SourceAssetRepository } from '../application/ports/source-asset.repository';
import type {
  CreateProjectEntityDto,
  CreateSourceAssetEntityDto,
  ProjectEntityDto,
  SourceAssetEntityDto,
} from '../application/dto/entity';
const now = () => new Date();
export class InMemoryProjectRepository implements ProjectRepository {
  readonly items = new Map<string, ProjectEntityDto>();
  async insert(input: CreateProjectEntityDto) {
    const value = {
      ...input,
      id: randomUUID(),
      createdAt: now(),
      updatedAt: now(),
    };
    this.items.set(value.id, value);
    return value;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async list() {
    return [...this.items.values()];
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}
export class InMemorySourceAssetRepository implements SourceAssetRepository {
  readonly items = new Map<string, SourceAssetEntityDto>();
  async insert(input: CreateSourceAssetEntityDto) {
    const value = {
      ...input,
      id: randomUUID(),
      createdAt: now(),
      updatedAt: now(),
    };
    this.items.set(value.projectId, value);
    return value;
  }
  async findByProjectId(id: string) {
    return this.items.get(id) ?? null;
  }
  async deleteByProjectId(id: string) {
    this.items.delete(id);
  }
}
export class InMemoryUnitOfWork {
  execute<T>(fn: (tx: unknown) => Promise<T>) {
    return fn({});
  }
}
