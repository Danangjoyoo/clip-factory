import type { ArchiveBuilderPort, ArchiveFile } from '../ports/archive-builder.port';
import type { RenderRepository } from '../ports/render.repository';

export interface ArchiveInput {
  renderId: string;
  title: string | null;
  sortOrder: number;
  outputKey: string;
  srtObjectKey?: string | null;
}

export interface CreateArchiveCommand {
  projectId: string;
  archiveId: string;
  renders: readonly ArchiveInput[];
}

export interface CreateArchiveResult {
  archiveKey: string;
}

export class CreateArchiveError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export class CreateArchiveService {
  constructor(
    private readonly repository: RenderRepository,
    private readonly builder: ArchiveBuilderPort,
  ) {}

  async execute(input: CreateArchiveCommand): Promise<CreateArchiveResult> {
    const ordered = [...input.renders].sort((a, b) => a.sortOrder - b.sortOrder);
    const successful = ordered.filter((item) => item.outputKey);
    if (!successful.length) {
      throw new CreateArchiveError('NO_SUCCESSFUL_RENDERS');
    }

    const archiveRenders: ArchiveInput[] = [];
    for (const item of successful) {
      const render = await this.repository.findById(item.renderId);
      if (render && render.projectId === input.projectId) archiveRenders.push(item);
    }
    if (!archiveRenders.length) {
      throw new CreateArchiveError('NO_SUCCESSFUL_RENDERS');
    }

    const files = this._toArchiveFiles(archiveRenders);
    const archiveKey = `projects/${input.projectId}/archives/${input.archiveId}.zip`;
    const built = await this.builder.build(input.projectId, archiveKey, files);
    return { archiveKey: built };
  }

  private _toArchiveFiles(renders: readonly ArchiveInput[]): ArchiveFile[] {
    return renders.flatMap((render, index) => {
      const base = this._safeName(render.title ?? 'clip');
      const ordinal = String(index + 1).padStart(3, '0');
      const files: ArchiveFile[] = [
        { name: `${ordinal}-${base}.mp4`, sourceKey: render.outputKey },
      ];
      if (render.srtObjectKey) {
        files.push({ name: `${ordinal}-${base}.srt`, sourceKey: render.srtObjectKey });
      }
      return files;
    });
  }

  private _safeName(value: string): string {
    const normalized = value.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    return normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'clip';
  }
}
