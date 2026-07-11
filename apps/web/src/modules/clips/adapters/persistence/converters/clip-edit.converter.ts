import type { ClipEditInput } from '../../../application/services/update-clip-edit.service';
import type { ClipEditRecordDto } from '../dto/record/clip-edit-record.dto';
export const clipEditRecordToEntity = (
  record: ClipEditRecordDto,
): ClipEditInput => ({
  clipId: record.clipId,
  renderId: record.renderId,
  source: record.sourceJson as ClipEditInput['source'],
  range: record.rangeJson as ClipEditInput['range'],
  captions: record.captionsJson as ClipEditInput['captions'],
  style: record.styleJson as ClipEditInput['style'],
  frame: record.frameJson as ClipEditInput['frame'],
  title: record.title,
  platformPreset: record.platformPreset as ClipEditInput['platformPreset'],
  encoder: (record.encoderJson as ClipEditInput['encoder']) ?? {
    strategy: 'SOFTWARE',
    videoCodec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
  },
});
export const clipEditEntityToRecord = (
  entity: ClipEditInput,
): ClipEditRecordDto => ({
  clipId: entity.clipId,
  renderId: entity.renderId,
  sourceJson: entity.source,
  rangeJson: entity.range,
  captionsJson: entity.captions,
  styleJson: entity.style,
  frameJson: entity.frame,
  title: entity.title ?? null,
  platformPreset: entity.platformPreset,
  encoderJson: entity.encoder ?? {
    strategy: 'SOFTWARE',
    videoCodec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
  },
});
