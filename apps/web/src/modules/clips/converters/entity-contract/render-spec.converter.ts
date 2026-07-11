import type { RenderSpec } from '@clip-factory/contracts';
import type { RenderSpecEntityDto } from '../../application/dto/entity/render-spec-entity.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PRIVATE_KEYS = new Set(['path', 'filepath', 'resolvedpath', 'candidatepath', 'url']);
const finiteInt = (value: number, name: string, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`INVALID_${name}`);
};
const assertSource = (source: RenderSpecEntityDto['source']): void => {
  const value = source as Record<string, unknown>;
  const scan = (item: unknown): void => {
    if (typeof item === 'string' && /^(?:file|https?):/u.test(item)) throw new Error('PRIVATE_SOURCE_VALUE');
    if (item && typeof item === 'object') for (const [key, nested] of Object.entries(item)) {
      if (PRIVATE_KEYS.has(key.toLowerCase())) throw new Error('PRIVATE_SOURCE_VALUE');
      scan(nested);
    }
  };
  scan(value);
  if (!UUID.test(String(value.sourceAssetId))) throw new Error('INVALID_SOURCE');
  if (value.kind === 'LOCAL_FILE') {
    if (!/^[a-f0-9]{64}$/u.test(String(value.fingerprint)) || typeof value.modifiedAt !== 'string') throw new Error('INVALID_SOURCE');
    finiteInt(Number(value.sizeBytes), 'SOURCE');
  } else if (value.kind === 'BROWSER_UPLOAD') {
    const object = value.object as Record<string, unknown>;
    if (!object || object.bucket !== 'clip-factory' || !object.key || !/^[a-f0-9]{64}$/u.test(String(object.sha256))) throw new Error('INVALID_SOURCE');
  } else throw new Error('INVALID_SOURCE');
};

export const renderSpecEntityToContract = (
  entity: RenderSpecEntityDto,
): RenderSpec => {
  if (!UUID.test(entity.renderId) || !UUID.test(entity.clipId)) throw new Error('INVALID_RENDER_ID');
  assertSource(entity.source);
  finiteInt(entity.range.startMs, 'RANGE');
  finiteInt(entity.range.endMs, 'RANGE');
  if (entity.range.endMs <= entity.range.startMs) throw new Error('INVALID_RANGE');
  entity.cropTrack.forEach((point) => {
    finiteInt(point.timeMs, 'CROP');
    finiteInt(point.centerXMicros, 'CROP', 0, 1_000_000);
    finiteInt(point.centerYMicros, 'CROP', 0, 1_000_000);
    finiteInt(point.confidenceMicros, 'CROP', 0, 1_000_000);
  });
  const captions = entity.captions.map((cue) => ({
    id: cue.id,
    startMs: cue.startMs,
    endMs: cue.endMs,
    words: cue.words.map((word) => ({
      text: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
    })),
  }));
  if (captions.some((cue) => !UUID.test(cue.id) || cue.endMs <= cue.startMs)) throw new Error('INVALID_CAPTION');
  if (entity.style.verticalPositionMicros < 0 || entity.style.verticalPositionMicros > 1_000_000) throw new Error('INVALID_STYLE');
  return {
    schemaVersion: entity.version,
    renderId: entity.renderId,
    clipId: entity.clipId,
    source: entity.source,
    canvas: entity.canvas,
    range: entity.range,
    cropTrack: [...entity.cropTrack],
    captions,
    style: entity.style,
    title: entity.title,
    encoder: entity.encoder,
    platformPreset: entity.platformPreset,
  };
};
