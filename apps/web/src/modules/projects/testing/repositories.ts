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
  async findById(id: string) {
    return [...this.items.values()].find((item) => item.id === id) ?? null;
  }
  async applyValidatedLocator(input: import('../application/dto/entity/worker-source-locator-entity.dto').ApplySourceValidationCommand) {
    const value = [...this.items.values()].find((item) => item.id === input.sourceAssetId);
    if (!value) throw new Error('source not found');
    const updated = { ...value, resolvedPath: input.resolvedPath, sizeBytes: input.sizeBytes, modifiedAt: new Date(input.modifiedAt), fingerprint: input.fingerprint, probe: input.probe, health: 'LOCATED' as const };
    this.items.set(value.projectId, updated);
    return updated;
  }
  async deleteByProjectId(id: string) {
    this.items.delete(id);
  }
  async attachUploadedObject(projectId: string, reference: import('../../storage/application/ports/artifact-store.port').ImmutableObjectReference) {
    const value = this.items.get(projectId);
    if (!value || value.kind !== 'BROWSER_UPLOAD') throw new Error('source is not browser upload');
    const updated = { ...value, objectKey: reference.key, objectVersionId: reference.versionId, objectSha256: reference.sha256, sizeBytes: reference.sizeBytes, health: 'LOCATED' as const, updatedAt: new Date() };
    this.items.set(projectId, updated); return updated;
  }
  async relink(id: string, candidate: Pick<SourceAssetEntityDto, 'displayPath' | 'resolvedPath' | 'sizeBytes' | 'modifiedAt' | 'fingerprint' | 'probe' | 'health'>) {
    const value = [...this.items.values()].find((item) => item.id === id);
    if (!value) throw new Error('source not found');
    const updated = { ...value, ...candidate, updatedAt: new Date() };
    this.items.set(value.projectId, updated);
    return updated;
  }
}
export class InMemoryUnitOfWork {
  execute<T>(fn: (tx: unknown) => Promise<T>) {
    return fn({});
  }
}
