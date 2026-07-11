import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
export class GetProjectService {
  constructor(
    private readonly projects: ProjectDataService,
    private readonly sources?: SourceAssetDataService,
  ) {}
  execute(id: string) {
    return this.projects.get(id).then(async (project) =>
      project
        ? {
            project,
            source: this.sources
              ? await this.sources.getByProjectId(project.id)
              : null,
          }
        : null,
    );
  }
}
