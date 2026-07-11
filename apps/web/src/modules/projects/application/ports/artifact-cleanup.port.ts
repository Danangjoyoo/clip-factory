export interface ArtifactCleanupPort {
  cleanupProject(projectId: string): Promise<void>;
}
