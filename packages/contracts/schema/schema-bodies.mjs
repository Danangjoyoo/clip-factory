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
  'youtube-publishing': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://clip-factory.local/contracts/youtube-publishing/1.0.0',
    title: 'Clip Factory YouTube Publishing Contracts',
    type: 'object',
    additionalProperties: false,
    anyOf: [
      { $ref: '#/$defs/oauthConnectionWorkflowInputV1' },
      { $ref: '#/$defs/oauthConnectionWorkflowResultV1' },
      { $ref: '#/$defs/youTubeConnectionEventV1' },
      { $ref: '#/$defs/metadataGenerationWorkflowInputV1' },
      { $ref: '#/$defs/publicationWorkflowInputV1' },
      { $ref: '#/$defs/publicationProgressEventV1' },
    ],
    $defs: {
      uuid,
      objectKey: {
        type: 'string',
        minLength: 1,
        maxLength: 1024,
        pattern: '^[^\\u0000]+$',
      },
      moneyMicrousd: { type: 'string', pattern: '^(0|[1-9][0-9]*)$' },
      nonnegativeIntegerString: {
        type: 'string',
        pattern: '^(0|[1-9][0-9]*)$',
      },
      objectReference,
      requiredScopes: {
        type: 'array',
        prefixItems: [
          { const: 'https://www.googleapis.com/auth/youtube.upload' },
          { const: 'https://www.googleapis.com/auth/youtube.readonly' },
        ],
        items: false,
        minItems: 2,
        maxItems: 2,
      },
      metadataSnapshotV1: object({
        title: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string' },
        hashtags: {
          type: 'array',
          items: { type: 'string', pattern: '^#[^\\s#]+$' },
          maxItems: 59,
          uniqueItems: true,
        },
        keywordTags: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
        },
        categoryId: { type: 'string', pattern: '^[0-9]+$' },
        defaultLanguage: { type: 'string', minLength: 2, maxLength: 35 },
        madeForKids: { type: 'boolean' },
        containsSyntheticMedia: { type: 'boolean' },
      }),
      OAuthConnectionWorkflowInputV1: object({
        contractVersion: { const: 1 },
        connectionId: { $ref: '#/$defs/uuid' },
        requestedScopes: { $ref: '#/$defs/requiredScopes' },
      }),
      OAuthConnectionWorkflowResultV1: object({
        contractVersion: { const: 1 },
        connectionId: { $ref: '#/$defs/uuid' },
        status: { enum: ['CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED'] },
        safeReasonCode: {
          type: ['string', 'null'],
          enum: [
            'CONSENT_DENIED',
            'STATE_MISMATCH',
            'STATE_EXPIRED',
            'MISSING_SCOPE',
            'CALLBACK_TIMEOUT',
            'GOOGLE_POLICY_DENIED',
            'INVALID_GRANT',
            null,
          ],
        },
      }),
      oauthConnectionWorkflowInputV1: {
        $ref: '#/$defs/OAuthConnectionWorkflowInputV1',
      },
      oauthConnectionWorkflowResultV1: {
        $ref: '#/$defs/OAuthConnectionWorkflowResultV1',
      },
      youTubeConnectionEventV1: {
        oneOf: [
          object({
            contractVersion: { const: 1 },
            type: { const: 'CONNECTED' },
            connectionId: { $ref: '#/$defs/uuid' },
            channelId: string,
            channelTitle: string,
            channelHandle: nullable(string),
            avatarUrl: nullable({ type: 'string', format: 'uri' }),
            grantedScopes: { $ref: '#/$defs/requiredScopes' },
            oauthMode: { enum: ['TESTING', 'PRODUCTION', 'UNKNOWN'] },
            refreshTokenExpiresAt: nullable(timestamp),
          }),
          object({
            contractVersion: { const: 1 },
            type: { const: 'REAUTH_REQUIRED' },
            connectionId: { $ref: '#/$defs/uuid' },
            reasonCode: { const: 'INVALID_GRANT' },
          }),
          object({
            contractVersion: { const: 1 },
            type: { const: 'DISCONNECTED' },
            connectionId: { $ref: '#/$defs/uuid' },
            revocationUncertain: { type: 'boolean' },
          }),
          object({
            contractVersion: { const: 1 },
            type: { const: 'FAILED' },
            connectionId: { $ref: '#/$defs/uuid' },
            reasonCode: {
              enum: [
                'CONSENT_DENIED',
                'STATE_MISMATCH',
                'STATE_EXPIRED',
                'MISSING_SCOPE',
                'CALLBACK_TIMEOUT',
                'GOOGLE_POLICY_DENIED',
              ],
            },
          }),
        ],
      },
      metadataGenerationWorkflowInputV1: object({
        contractVersion: { const: 1 },
        projectId: { $ref: '#/$defs/uuid' },
        clipId: { $ref: '#/$defs/uuid' },
        draftId: { $ref: '#/$defs/uuid' },
        callId: { $ref: '#/$defs/uuid' },
        requestHash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        transcriptObject: { $ref: '#/$defs/objectReference' },
        modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] },
        reasoningLevel: {
          enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
        },
        modelCatalogVersion: string,
        pricingVersion: string,
        maxGeneratedTokens: { type: 'integer', minimum: 1 },
        promptCachePolicy: {
          enum: ['EXPLICIT_DISABLED', 'LEGACY_AUTOMATIC_NO_WRITE_FEE'],
        },
        maxCostMicrousd: { $ref: '#/$defs/moneyMicrousd' },
        instruction: nullable({ type: 'string', maxLength: 2000 }),
      }),
      publicationWorkflowInputV1: {
        ...object({
          contractVersion: { const: 1 },
          publicationId: { $ref: '#/$defs/uuid' },
          attemptId: { $ref: '#/$defs/uuid' },
          connectionId: { $ref: '#/$defs/uuid' },
          clipId: { $ref: '#/$defs/uuid' },
          renderId: { $ref: '#/$defs/uuid' },
          renderObject: { $ref: '#/$defs/objectReference' },
          coverObject: nullable({ $ref: '#/$defs/objectReference' }),
          totalBytes: { type: 'integer', minimum: 1 },
          metadataSnapshot: { $ref: '#/$defs/metadataSnapshotV1' },
          visibility: { enum: ['PRIVATE_REVIEW', 'SCHEDULED'] },
          scheduleAtUtc: nullable(timestamp),
          sourceTimezone: nullable(string),
          apiProjectVerified: { type: 'boolean' },
        }),
        allOf: [
          {
            if: {
              properties: { visibility: { const: 'SCHEDULED' } },
              required: ['visibility'],
            },
            then: {
              properties: {
                scheduleAtUtc: timestamp,
                sourceTimezone: string,
                apiProjectVerified: { const: true },
              },
            },
            else: {
              properties: {
                scheduleAtUtc: { type: 'null' },
                sourceTimezone: { type: 'null' },
              },
            },
          },
        ],
      },
      publicationUploadProgressEventV1: object({
        contractVersion: { const: 1 },
        type: { const: 'UPLOAD_PROGRESS' },
        publicationId: { $ref: '#/$defs/uuid' },
        attemptId: { $ref: '#/$defs/uuid' },
        acknowledgedBytes: { $ref: '#/$defs/nonnegativeIntegerString' },
        progressPercent: { type: 'integer', minimum: 0, maximum: 100 },
      }),
      publicationUploadOutcomeUncertainEventV1: object({
        contractVersion: { const: 1 },
        type: { const: 'UPLOAD_OUTCOME_UNCERTAIN' },
        publicationId: { $ref: '#/$defs/uuid' },
        attemptId: { $ref: '#/$defs/uuid' },
        finalChunkDispatchedAt: timestamp,
        safeReasonCode: {
          enum: [
            'FINAL_UPLOAD_RESULT_UNKNOWN',
            'SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH',
          ],
        },
        requiredAction: {
          const: 'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK',
        },
      }),
      publicationVideoCreatedEventV1: object({
        contractVersion: { const: 1 },
        type: { const: 'VIDEO_CREATED' },
        publicationId: { $ref: '#/$defs/uuid' },
        attemptId: { $ref: '#/$defs/uuid' },
        videoId: { type: 'string', pattern: '^[A-Za-z0-9_-]{6,64}$' },
        videoUrl: { type: 'string', format: 'uri' },
        createdAt: timestamp,
      }),
      publicationProgressEventV1: {
        oneOf: [
          { $ref: '#/$defs/publicationUploadProgressEventV1' },
          { $ref: '#/$defs/publicationUploadOutcomeUncertainEventV1' },
          { $ref: '#/$defs/publicationVideoCreatedEventV1' },
        ],
      },
    },
  },
};
