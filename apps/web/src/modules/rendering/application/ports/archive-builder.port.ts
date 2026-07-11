export interface ArchiveFile {
  name: string;
  sourceKey: string;
}

export interface ArchiveBuilderPort {
  build(projectId: string, outputKey: string, files: readonly ArchiveFile[]): Promise<string>;
}
