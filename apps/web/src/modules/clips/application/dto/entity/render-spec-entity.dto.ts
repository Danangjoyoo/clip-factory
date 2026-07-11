import type { RenderSpec } from '@clip-factory/contracts';
import type { CaptionDocumentV1 } from '../../../domain/caption';
import type {
  CaptionStyleV1,
  FrameConfigurationV1,
} from './caption-style-entity.dto';
export type RenderSourceSnapshotV1 = RenderSpec['source'];
export interface RenderSpecEntityDto {
  readonly version: '1.0.0';
  readonly renderId: string;
  readonly clipId: string;
  readonly source: RenderSourceSnapshotV1;
  readonly canvas: { readonly width: 1080; readonly height: 1920 };
  readonly range: { readonly startMs: number; readonly endMs: number };
  readonly cropTrack: readonly FrameConfigurationV1['automaticTrack'][number][];
  readonly captions: readonly CaptionDocumentV1['cues'][number][];
  readonly captionDocument: CaptionDocumentV1;
  readonly style: CaptionStyleV1;
  readonly title: string | null;
  readonly encoder: RenderSpec['encoder'];
  readonly platformPreset: RenderSpec['platformPreset'];
}
