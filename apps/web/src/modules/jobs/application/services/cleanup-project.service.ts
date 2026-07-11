export interface ProjectCleanupPort {
  cleanupProject(projectId: string): Promise<void>;
}
export class CleanupProjectService {
  constructor(private readonly cleanup: ProjectCleanupPort) {}
  execute(projectId: string) {
    return this.cleanup.cleanupProject(projectId);
  }
}
