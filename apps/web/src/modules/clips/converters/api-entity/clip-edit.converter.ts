import type { ClipEditApiDto } from '../../delivery/http/dto/api/clip-edit-api.dto';
import type { ClipEditInput } from '../../application/services/update-clip-edit.service';
export const clipEditApiToEntity = (
  clipId: string,
  value: ClipEditApiDto,
): ClipEditInput => ({
  ...value,
  clipId,
  source: value.source as unknown as ClipEditInput['source'],
  captions: value.captions as unknown as ClipEditInput['captions'],
  style: value.style as unknown as ClipEditInput['style'],
  frame: value.frame as unknown as ClipEditInput['frame'],
  title: value.title ?? null,
  encoder: (value.encoder as unknown as ClipEditInput['encoder']) ?? {
    strategy: 'SOFTWARE',
    videoCodec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
  },
});
export const clipEditEntityToApi = (value: ClipEditInput): ClipEditApiDto => ({
  renderId: value.renderId,
  source: value.source,
  range: value.range,
  captions: value.captions as unknown as ClipEditApiDto['captions'],
  style: value.style as unknown as ClipEditApiDto['style'],
  frame: value.frame as unknown as ClipEditApiDto['frame'],
  title: value.title ?? null,
  platformPreset: value.platformPreset,
  encoder: value.encoder as unknown as ClipEditApiDto['encoder'],
});
