import type { RenderSpec } from '@clip-factory/contracts';
import type { RenderSpecEntityDto } from '../../application/dto/entity/render-spec-entity.dto';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PRIVATE_KEYS = new Set([
  'path',
  'filepath',
  'resolvedpath',
  'candidatepath',
  'url',
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (
  value: unknown,
  keys: readonly string[],
  name: string,
): Record<string, unknown> => {
  if (!isRecord(value) || Object.keys(value).some((key) => !keys.includes(key)))
    throw new Error(`INVALID_${name}`);
  return value;
};
function finiteInt(
  value: unknown,
  name: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`INVALID_${name}`);
}

const assertSource = (source: RenderSpecEntityDto['source']): void => {
  const scan = (item: unknown): void => {
    if (
      typeof item === 'string' &&
      (/^(?:file|https?):/u.test(item) ||
        /^(?:\/|[A-Za-z]:[\\/]|\\\\)/u.test(item))
    )
      throw new Error('PRIVATE_SOURCE_VALUE');
    if (isRecord(item))
      for (const [key, nested] of Object.entries(item)) {
        if (PRIVATE_KEYS.has(key.toLowerCase()))
          throw new Error('PRIVATE_SOURCE_VALUE');
        scan(nested);
      }
  };
  scan(source);
  const value = source as unknown;
  if (!isRecord(value) || !UUID.test(String(value.sourceAssetId)))
    throw new Error('INVALID_SOURCE');
  if (value.kind === 'LOCAL_FILE') {
    exact(
      value,
      ['kind', 'sourceAssetId', 'fingerprint', 'sizeBytes', 'modifiedAt'],
      'SOURCE',
    );
    if (
      !/^[a-f0-9]{64}$/u.test(String(value.fingerprint)) ||
      typeof value.modifiedAt !== 'string'
    )
      throw new Error('INVALID_SOURCE');
    finiteInt(value.sizeBytes, 'SOURCE');
  } else if (value.kind === 'BROWSER_UPLOAD') {
    exact(value, ['kind', 'sourceAssetId', 'object'], 'SOURCE');
    const object = exact(
      value.object,
      ['bucket', 'key', 'versionId', 'sha256'],
      'SOURCE',
    );
    if (
      object.bucket !== 'clip-factory' ||
      typeof object.key !== 'string' ||
      !object.key ||
      (object.versionId !== null && typeof object.versionId !== 'string') ||
      !/^[a-f0-9]{64}$/u.test(String(object.sha256))
    )
      throw new Error('INVALID_SOURCE');
  } else throw new Error('INVALID_SOURCE');
};

export const renderSpecEntityToContract = (
  entity: RenderSpecEntityDto,
): RenderSpec => {
  exact(
    entity,
    [
      'version',
      'renderId',
      'clipId',
      'source',
      'canvas',
      'range',
      'cropTrack',
      'captions',
      'captionDocument',
      'style',
      'title',
      'encoder',
      'platformPreset',
    ],
    'RENDER_SPEC',
  );
  if (
    entity.version !== '1.0.0' ||
    !UUID.test(entity.renderId) ||
    !UUID.test(entity.clipId)
  )
    throw new Error('INVALID_RENDER_ID');
  assertSource(entity.source);
  const canvas = exact(entity.canvas, ['width', 'height'], 'CANVAS');
  if (canvas.width !== 1080 || canvas.height !== 1920)
    throw new Error('INVALID_CANVAS');
  const document = exact(
    entity.captionDocument,
    ['version', 'languageTag', 'cues'],
    'CAPTION_DOCUMENT',
  );
  if (
    document.version !== 1 ||
    typeof document.languageTag !== 'string' ||
    !document.languageTag ||
    !Array.isArray(document.cues)
  )
    throw new Error('INVALID_CAPTION_DOCUMENT');
  finiteInt(entity.range.startMs, 'RANGE');
  finiteInt(entity.range.endMs, 'RANGE');
  if (entity.range.endMs <= entity.range.startMs)
    throw new Error('INVALID_RANGE');
  if (!Array.isArray(entity.cropTrack) || !Array.isArray(entity.captions))
    throw new Error('INVALID_RENDER_SPEC');
  entity.cropTrack.forEach((point) => {
    exact(
      point,
      [
        'timeMs',
        'centerXMicros',
        'centerYMicros',
        'confidenceMicros',
        'source',
      ],
      'CROP',
    );
    finiteInt(point.timeMs, 'CROP');
    finiteInt(point.centerXMicros, 'CROP', 0, 1_000_000);
    finiteInt(point.centerYMicros, 'CROP', 0, 1_000_000);
    finiteInt(point.confidenceMicros, 'CROP', 0, 1_000_000);
    if (
      !['SUBJECT_TRACK', 'CENTER_FALLBACK', 'MANUAL_FOCAL_POINT'].includes(
        point.source,
      )
    )
      throw new Error('INVALID_CROP');
  });
  const captions = entity.captions.map((cue) => {
    exact(cue, ['id', 'startMs', 'endMs', 'words'], 'CAPTION');
    if (!UUID.test(cue.id)) throw new Error('INVALID_CAPTION');
    finiteInt(cue.startMs, 'CAPTION');
    finiteInt(cue.endMs, 'CAPTION');
    if (cue.endMs <= cue.startMs || !Array.isArray(cue.words))
      throw new Error('INVALID_CAPTION');
    const words = cue.words.map(
      (word: { id: string; text: string; startMs: number; endMs: number }) => {
        exact(word, ['id', 'text', 'startMs', 'endMs'], 'CAPTION_WORD');
        if (!word.id || typeof word.text !== 'string' || !word.text.trim())
          throw new Error('INVALID_CAPTION_WORD');
        finiteInt(word.startMs, 'CAPTION_WORD');
        finiteInt(word.endMs, 'CAPTION_WORD');
        if (
          word.endMs <= word.startMs ||
          word.startMs < cue.startMs ||
          word.endMs > cue.endMs
        )
          throw new Error('INVALID_CAPTION_WORD');
        return { text: word.text, startMs: word.startMs, endMs: word.endMs };
      },
    );
    return { id: cue.id, startMs: cue.startMs, endMs: cue.endMs, words };
  });
  exact(
    entity.style,
    [
      'version',
      'fontFamily',
      'fontSizePx',
      'textColor',
      'outlineColor',
      'backgroundColor',
      'activeWordColor',
      'verticalPositionMicros',
      'maxWordsPerLine',
      'activeWordEmphasis',
    ],
    'STYLE',
  );
  if (
    entity.style.version !== 1 ||
    !['Inter', 'Arial', 'Helvetica Neue'].includes(entity.style.fontFamily) ||
    !Number.isInteger(entity.style.fontSizePx) ||
    entity.style.fontSizePx < 24 ||
    entity.style.fontSizePx > 160 ||
    ![
      entity.style.textColor,
      entity.style.outlineColor,
      entity.style.backgroundColor,
      entity.style.activeWordColor,
    ].every((value) => /^#[A-Fa-f0-9]{8}$/u.test(value)) ||
    !Number.isInteger(entity.style.verticalPositionMicros) ||
    entity.style.verticalPositionMicros < 0 ||
    entity.style.verticalPositionMicros > 1_000_000 ||
    !Number.isInteger(entity.style.maxWordsPerLine) ||
    entity.style.maxWordsPerLine < 1 ||
    entity.style.maxWordsPerLine > 12 ||
    typeof entity.style.activeWordEmphasis !== 'boolean'
  )
    throw new Error('INVALID_STYLE');
  if (
    entity.title !== null &&
    (typeof entity.title !== 'string' || entity.title.length > 120)
  )
    throw new Error('INVALID_TITLE');
  exact(
    entity.encoder,
    ['strategy', 'videoCodec', 'audioCodec', 'pixelFormat'],
    'ENCODER',
  );
  if (
    !['VIDEOTOOLBOX', 'SOFTWARE'].includes(entity.encoder.strategy) ||
    entity.encoder.videoCodec !== 'h264' ||
    entity.encoder.audioCodec !== 'aac' ||
    entity.encoder.pixelFormat !== 'yuv420p'
  )
    throw new Error('INVALID_ENCODER');
  if (
    !['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK'].includes(
      entity.platformPreset,
    )
  )
    throw new Error('INVALID_PLATFORM');
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
