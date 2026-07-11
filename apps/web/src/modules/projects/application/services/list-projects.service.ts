import { ProjectDataService } from '../data-services/project.data-service';
export class ListProjectsService {
  constructor(private readonly projects: ProjectDataService) {}
  execute() {
    return this.projects.list();
  }
}
