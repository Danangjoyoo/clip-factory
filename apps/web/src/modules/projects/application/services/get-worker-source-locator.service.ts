import type { SourceAssetDataService } from '../data-services/source-asset.data-service';
export class SourceNotReadyError extends Error {
  constructor(id: string) {
    super(`Source not ready: ${id}`);
  }
}
export class GetWorkerSourceLocatorService {
  constructor(private readonly sources: SourceAssetDataService) {}
  async execute(id: string) {
    const source = await this.sources.findById(id);
    if (!source) throw new SourceNotReadyError(id);
    if (source.kind === 'LOCAL_FILE')
      return {
        kind: 'LOCAL_FILE' as const,
        candidatePath: source.resolvedPath ?? source.displayPath,
      };
    if (!source.objectKey) throw new SourceNotReadyError(id);
    return {
      kind: 'BROWSER_UPLOAD' as const,
      objectReference: {
        bucket: 'clip-factory',
        key: source.objectKey,
        versionId: source.objectVersionId,
      },
    };
  }
}
