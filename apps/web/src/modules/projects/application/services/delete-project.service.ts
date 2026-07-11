import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
import type { UnitOfWork } from '../ports/unit-of-work.port';
import type { WorkflowControlPort } from '../ports/workflow-control.port';
import type { ArtifactCleanupPort } from '../ports/artifact-cleanup.port';
export class DeleteProjectService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly projects: ProjectDataService,
    private readonly sources: SourceAssetDataService,
    private readonly workflows: WorkflowControlPort,
    private readonly artifacts: ArtifactCleanupPort,
  ) {}
  async execute(id: string) {
    const project = await this.projects.get(id);
    if (!project) return false;
    if (project.activeWorkflowId)
      await this.workflows.cancel(project.activeWorkflowId);
    await this.artifacts.cleanupProject(id);
    await this.uow.execute(async (tx) => {
      await this.sources.deleteByProjectId(id, tx);
      await this.projects.delete(id, tx);
    });
    return true;
  }
}
