import {
  validateCaptionDocument,
  updateCaptionText,
  type CaptionDocumentV1,
} from '../../domain/caption';
export { updateCaptionText };
import type {
  CaptionStyleV1,
  FrameConfigurationV1,
} from '../dto/entity/caption-style-entity.dto';
import type { RenderSourceSnapshotV1 } from '../dto/entity/render-spec-entity.dto';

export interface ClipEditInput {
  clipId: string;
  renderId: string;
  source: RenderSourceSnapshotV1;
  range: { startMs: number; endMs: number };
  captions: CaptionDocumentV1;
  style: CaptionStyleV1;
  frame: FrameConfigurationV1;
  title?: string | null;
  platformPreset: 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'TIKTOK';
  encoder?: {
    strategy: 'VIDEOTOOLBOX' | 'SOFTWARE';
    videoCodec: 'h264';
    audioCodec: 'aac';
    pixelFormat: 'yuv420p';
  };
}
export type PlatformCatalog = Readonly<
  Record<
    ClipEditInput['platformPreset'],
    { safeArea: { top: number; bottom: number } }
  >
>;

const color = /^#[A-Fa-f0-9]{8}$/u;
export function validateClipEdit(
  edit: ClipEditInput,
  catalog: PlatformCatalog,
): void {
  if (
    !edit.clipId ||
    !edit.renderId ||
    edit.range.startMs < 0 ||
    edit.range.endMs <= edit.range.startMs
  )
    throw new Error('INVALID_CLIP_RANGE');
  if (
    edit.title !== undefined &&
    edit.title !== null &&
    edit.title.length > 120
  )
    throw new Error('INVALID_TITLE');
  const s = edit.style;
  if (!['Inter', 'Arial', 'Helvetica Neue'].includes(s.fontFamily))
    throw new Error('INVALID_FONT_FAMILY');
  if (
    !Number.isInteger(s.fontSizePx) ||
    s.fontSizePx < 24 ||
    s.fontSizePx > 160
  )
    throw new Error('INVALID_FONT_SIZE');
  if (
    ![s.textColor, s.outlineColor, s.backgroundColor, s.activeWordColor].every(
      (v) => color.test(v),
    )
  )
    throw new Error('INVALID_COLOR');
  const safe = catalog[edit.platformPreset]?.safeArea;
  if (
    !safe ||
    s.verticalPositionMicros < safe.top * 1_000_000 ||
    s.verticalPositionMicros > (1 - safe.bottom) * 1_000_000
  )
    throw new Error('INVALID_SAFE_AREA');
  if (
    !Number.isInteger(s.maxWordsPerLine) ||
    s.maxWordsPerLine < 1 ||
    s.maxWordsPerLine > 12
  )
    throw new Error('INVALID_WORDS_PER_LINE');
  for (const point of edit.frame.automaticTrack)
    if (
      [point.centerXMicros, point.centerYMicros, point.confidenceMicros].some(
        (v) => !Number.isInteger(v) || v < 0 || v > 1_000_000,
      )
    )
      throw new Error('INVALID_CROP');
  validateCaptionDocument(edit.captions);
}

export class UpdateClipEditService {
  constructor(
    private readonly save: (edit: ClipEditInput) => Promise<void>,
    private readonly catalog: PlatformCatalog,
  ) {}
  async execute(edit: ClipEditInput): Promise<ClipEditInput> {
    validateClipEdit(edit, this.catalog);
    await this.save(edit);
    return edit;
  }
}
