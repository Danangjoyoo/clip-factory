const string = { type: 'string', minLength: 1 };
const integer = { type: 'integer', minimum: 0 };
const uuid = { type: 'string', format: 'uuid' };
const timestamp = { type: 'string', format: 'date-time' };
const nullable = (value) => ({ anyOf: [value, { type: 'null' }] });
const array = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
});
const versioned = (title, properties, required = Object.keys(properties)) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://clip-factory.local/contracts/${title}/1.0.0`,
  title,
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', ...required],
  properties: { schemaVersion: { const: '1.0.0' }, ...properties },
});
const withReasoning = (schema) => ({
  ...schema,
  allOf: [
    {
      if: {
        properties: { modelId: { const: 'gpt-5.6-sol' } },
        required: ['modelId'],
      },
      then: {
        properties: {
          reasoning: {
            enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          },
        },
      },
    },
    {
      if: {
        properties: { modelId: { const: 'gpt-5.5' } },
        required: ['modelId'],
      },
      then: {
        properties: {
          reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh'] },
        },
      },
    },
  ],
});
const objectReference = object({
  bucket: { const: 'clip-factory' },
  key: string,
  versionId: nullable(string),
  sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
});
const error = object({
  code: string,
  category: { enum: ['RETRYABLE', 'NON_RETRYABLE', 'WAITING', 'CANCELLED'] },
  retryable: { type: 'boolean' },
  message: string,
  requiredAction: nullable(string),
  details: { type: 'object', additionalProperties: true },
});
const mediaVideo = object({
  codec: string,
  width: { type: 'integer', minimum: 1 },
  height: { type: 'integer', minimum: 1 },
  frameRateNumerator: { type: 'integer', minimum: 1 },
  frameRateDenominator: { type: 'integer', minimum: 1 },
});
const mediaAudio = object({
  codec: string,
  sampleRateHz: { type: 'integer', minimum: 1 },
  channels: { type: 'integer', minimum: 1 },
});
const score = { type: 'integer', minimum: 0, maximum: 1000000 };
const scores = object({
  hook: score,
  coherence: score,
  payoff: score,
  novelty: score,
  energy: score,
  instructionFit: score,
  boundaryQuality: score,
});
const transcriptWord = object({
  text: string,
  startMs: integer,
  endMs: integer,
  confidenceMicros: nullable(score),
});
const transcriptSegment = object({
  text: string,
  startMs: integer,
  endMs: integer,
  wordStartIndex: integer,
  wordEndIndex: integer,
});
const cropPoint = object({
  timeMs: integer,
  centerXMicros: score,
  centerYMicros: score,
  confidenceMicros: score,
  source: { enum: ['SUBJECT_TRACK', 'CENTER_FALLBACK', 'MANUAL_FOCAL_POINT'] },
});
const captionCue = object({
  id: uuid,
  startMs: integer,
  endMs: integer,
  words: array(object({ text: string, startMs: integer, endMs: integer })),
});
const captionStyle = object({
  fontFamily: { enum: ['Inter', 'Arial', 'Helvetica Neue'] },
  fontSizePx: { type: 'integer', minimum: 24, maximum: 160 },
  textColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' },
  outlineColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' },
  backgroundColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' },
  activeWordColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' },
  verticalPositionMicros: score,
  maxWordsPerLine: { type: 'integer', minimum: 1, maximum: 12 },
  activeWordEmphasis: { type: 'boolean' },
});
const renderSource = {
  oneOf: [
    object({
      kind: { const: 'LOCAL_FILE' },
      sourceAssetId: uuid,
      fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      sizeBytes: { type: 'integer', minimum: 1 },
      modifiedAt: timestamp,
    }),
    object({
      kind: { const: 'BROWSER_UPLOAD' },
      sourceAssetId: uuid,
      object: objectReference,
    }),
  ],
};

export const schemaBodies = {
  common: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://clip-factory.local/contracts/common/1.0.0',
    title: 'Common',
    $defs: {
      objectReference,
      error,
      mediaVideo,
      mediaAudio,
      transcriptWord,
      transcriptSegment,
      scores,
      cropPoint,
      captionCue,
      captionStyle,
    },
  },
  'workflow-input': versioned('WorkflowInput', {
    workflowId: uuid,
    projectId: uuid,
    sourceAssetId: uuid,
    mode: { enum: ['AI_HIGHLIGHTS', 'MANUAL'] },
    languageTag: {
      type: 'string',
      pattern: '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$',
    },
    maxClipSeconds: { type: 'integer', minimum: 1, maximum: 10800 },
    platformPreset: { enum: ['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK'] },
    analysis: nullable(
      withReasoning(
        object({
          modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] },
          reasoning: {
            enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          },
          budgetMicrousd: integer,
          maximumClips: { type: 'integer', minimum: 1, maximum: 50 },
          instruction: nullable({ type: 'string', maxLength: 2000 }),
          coverageStartMs: integer,
          coverageEndMs: integer,
        }),
      ),
    ),
    requestedAt: timestamp,
  }),
  'workflow-result': versioned('WorkflowResult', {
    workflowId: uuid,
    projectId: uuid,
    status: { enum: ['COMPLETED', 'FAILED', 'CANCELLED'] },
    transcriptObject: nullable(objectReference),
    clipIds: array(uuid),
    error: nullable(error),
    completedAt: timestamp,
  }),
  'progress-event': versioned('ProgressEvent', {
    workflowId: uuid,
    projectId: uuid,
    scope: { enum: ['ANALYSIS', 'RENDER'] },
    stage: string,
    completedUnits: integer,
    totalUnits: { type: 'integer', minimum: 1 },
    unit: {
      enum: ['BYTES', 'MEDIA_MILLISECONDS', 'WINDOWS', 'FRAMES', 'ITEMS'],
    },
    etaLowSeconds: nullable(integer),
    etaHighSeconds: nullable(integer),
    confidence: { enum: ['LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE'] },
    occurredAt: timestamp,
  }),
  'worker-health': versioned('WorkerHealth', {
    workerId: uuid,
    status: { enum: ['ONLINE', 'DEGRADED', 'OFFLINE'] },
    hardware: object({
      architecture: { const: 'arm64' },
      chip: string,
      memoryBytes: { type: 'integer', minimum: 1 },
    }),
    ffmpegVersion: string,
    transcriber: object({
      backend: { enum: ['MLX_WHISPER', 'FAKE'] },
      model: string,
      revision: string,
      weightsSha256: nullable({ type: 'string', pattern: '^[a-f0-9]{64}$' }),
      cacheStatus: { enum: ['READY', 'MISSING', 'INVALID', 'NOT_APPLICABLE'] },
    }),
    openAiConfigured: { type: 'boolean' },
    openAiModelAccess: array(
      object({
        modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] },
        status: { enum: ['AVAILABLE', 'NOT_ENTITLED', 'NOT_FOUND', 'UNKNOWN'] },
        checkedAt: nullable(timestamp),
      }),
    ),
    heartbeatAt: timestamp,
  }),
  'media-probe': versioned('MediaProbe', {
    durationMs: { type: 'integer', minimum: 1 },
    sizeBytes: { type: 'integer', minimum: 1 },
    container: { enum: ['mp4', 'mov', 'matroska', 'webm'] },
    video: mediaVideo,
    audio: mediaAudio,
    formatTags: { type: 'object', additionalProperties: { type: 'string' } },
  }),
  transcript: versioned('Transcript', {
    transcriptId: uuid,
    languageTag: string,
    text: { type: 'string' },
    segments: array(transcriptSegment),
    words: array(transcriptWord),
    backend: { enum: ['MLX_WHISPER', 'FAKE'] },
    model: string,
    modelRevision: string,
    weightsSha256: nullable({ type: 'string', pattern: '^[a-f0-9]{64}$' }),
    durationMs: integer,
  }),
  'highlight-response': versioned('HighlightResponse', {
    analysisRunId: uuid,
    candidates: array(
      object({
        startMs: integer,
        endMs: integer,
        title: { type: 'string', minLength: 1, maxLength: 120 },
        rationale: { type: 'string', minLength: 1, maxLength: 1000 },
        rank: { type: 'integer', minimum: 1 },
        overallScore: score,
        scores,
      }),
    ),
  }),
  'render-spec': versioned('RenderSpec', {
    renderId: uuid,
    clipId: uuid,
    source: renderSource,
    canvas: object({ width: { const: 1080 }, height: { const: 1920 } }),
    range: object({ startMs: integer, endMs: integer }),
    cropTrack: array(cropPoint),
    captions: array(captionCue),
    style: captionStyle,
    title: nullable({ type: 'string', maxLength: 120 }),
    encoder: object({
      strategy: { enum: ['VIDEOTOOLBOX', 'SOFTWARE'] },
      videoCodec: { const: 'h264' },
      audioCodec: { const: 'aac' },
      pixelFormat: { const: 'yuv420p' },
    }),
    platformPreset: { enum: ['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK'] },
  }),
  'cost-data': withReasoning(
    versioned('CostData', {
      analysisRunId: uuid,
      modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] },
      reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'] },
      pricingVersion: { const: 'openai-2026-07-11.1' },
      budgetMicrousd: integer,
      reservedMicrousd: integer,
      spentMicrousd: integer,
      calls: array(
        object({
          purpose: { enum: ['HIGHLIGHT_WINDOW', 'GLOBAL_RANKING'] },
          responseId: string,
          inputTokens: integer,
          cachedInputTokens: integer,
          cacheWriteInputTokens: integer,
          outputTokens: integer,
          reasoningTokens: integer,
          costMicrousd: integer,
        }),
      ),
    }),
  ),
  error: versioned('ErrorEnvelope', { error }),
};
