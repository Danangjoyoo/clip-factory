import type { CreateProjectEntityRequest } from '../dto/entity';
import type { UnitOfWork } from '../ports/unit-of-work.port';
import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
export class CreateProjectService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly projects: ProjectDataService,
    private readonly sources: SourceAssetDataService,
  ) {}
  execute(input: CreateProjectEntityRequest) {
    return this.uow.execute(async (tx) => {
      const project = await this.projects.create(
        {
          name: input.name,
          mode: input.mode,
          languageTag: input.languageTag,
          defaultMaxClipSeconds: input.defaultMaxClipSeconds,
          defaultPlatformPreset: input.defaultPlatformPreset,
          status: 'DRAFT',
          activeWorkflowId: null,
          openaiSpendMicrousd: 0n,
        },
        tx,
      );
      const sourceInput =
        input.source.kind === 'LOCAL_FILE'
          ? {
              kind: input.source.kind,
              displayPath: input.source.displayPath,
              sizeBytes: null,
            }
          : {
              kind: input.source.kind,
              displayPath: input.source.fileName,
              sizeBytes: input.source.sizeBytes,
            };
      const source = await this.sources.create(
        {
          projectId: project.id,
          ...sourceInput,
          resolvedPath: null,
          objectKey: null,
          objectVersionId: null,
          objectSha256: null,
          modifiedAt: null,
          fingerprint: null,
          probe: null,
          health: 'UNKNOWN',
        },
        tx,
      );
      return { project, source };
    });
  }
}
