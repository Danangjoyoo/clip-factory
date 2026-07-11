import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
export class ListProjectsService {
  constructor(
    private readonly projects: ProjectDataService,
    private readonly sources?: SourceAssetDataService,
  ) {}
  execute() {
    return this.projects.list().then(async (projects) =>
      Promise.all(
        projects.map(async (project) => ({
          project,
          source: this.sources
            ? await this.sources.getByProjectId(project.id)
            : null,
        })),
      ),
    );
  }
}
