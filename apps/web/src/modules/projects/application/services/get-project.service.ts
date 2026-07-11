import { ProjectDataService } from '../data-services/project.data-service';
export class GetProjectService {
  constructor(private readonly projects: ProjectDataService) {}
  execute(id: string) {
    return this.projects.get(id);
  }
}
