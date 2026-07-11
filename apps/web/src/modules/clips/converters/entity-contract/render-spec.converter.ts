import type { RenderSpec } from '@clip-factory/contracts';
import type { RenderSpecEntityDto } from '../../application/dto/entity/render-spec-entity.dto';
export const renderSpecEntityToContract = (
  entity: RenderSpecEntityDto,
): RenderSpec => ({
  schemaVersion: entity.version,
  renderId: entity.renderId,
  clipId: entity.clipId,
  source: entity.source,
  canvas: entity.canvas,
  range: entity.range,
  cropTrack: [...entity.cropTrack],
  captions: entity.captions.map((cue) => ({
    id: cue.id,
    startMs: cue.startMs,
    endMs: cue.endMs,
    words: cue.words.map((word) => ({
      text: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
    })),
  })),
  style: entity.style,
  title: entity.title,
  encoder: entity.encoder,
  platformPreset: entity.platformPreset,
});
