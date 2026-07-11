import type { SourceAssetDataService } from '../data-services/source-asset.data-service';
import type { SourceAssetEntityDto } from '../dto/entity/source-asset-entity.dto';
import type { UnitOfWork } from '../ports/unit-of-work.port';
import type { WorkflowControlPort } from '../ports/workflow-control.port';

export class RelinkIncompatibleError extends Error { code = 'RELINK_INCOMPATIBLE'; }
export class RelinkConfirmationRequiredError extends Error { code = 'RELINK_CONFIRMATION_REQUIRED'; }

type Candidate = Pick<SourceAssetEntityDto, 'displayPath' | 'resolvedPath' | 'sizeBytes' | 'modifiedAt' | 'fingerprint' | 'probe'>;
const probe = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {});
const compatible = (a: unknown, b: unknown) => {
  const left = probe(a), right = probe(b);
  const duration = Math.abs(Number(left.durationMs ?? 0) - Number(right.durationMs ?? 0));
  return duration <= 1000 && left.width === right.width && left.height === right.height && left.hasAudio === right.hasAudio && left.codecFamily === right.codecFamily;
};

export class RelinkSourceService {
  constructor(private readonly uow: UnitOfWork, private readonly sources: SourceAssetDataService, private readonly workflows: WorkflowControlPort) {}
  async execute(input: { projectId: string; candidate: Candidate; confirmedFingerprint?: string }) {
    const source = await this.sources.getByProjectId(input.projectId);
    if (!source) throw new Error('SOURCE_NOT_FOUND');
    if (!compatible(source.probe, input.candidate.probe)) throw new RelinkIncompatibleError('candidate media is incompatible');
    if (source.fingerprint !== input.candidate.fingerprint && input.confirmedFingerprint !== input.candidate.fingerprint) return { sourceAssetId: source.id, confirmationRequired: true, fingerprint: input.candidate.fingerprint };
    const updated = await this.uow.execute(async (tx) => this.sources.relink(source.id, { ...input.candidate, health: 'LOCATED' }, tx));
    if (this.workflows.signal) await this.workflows.signal(input.projectId, 'source_relinked');
    return { sourceAssetId: updated.id, confirmationRequired: false, fingerprint: updated.fingerprint };
  }
}
