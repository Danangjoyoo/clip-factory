const SAFE = new Set([
  'timestamp',
  'level',
  'event',
  'projectId',
  'workflowId',
  'activityId',
  'clipId',
  'renderId',
  'errorCode',
  'stage',
  'durationMs',
  'retryCount',
  'modelId',
  'tokenCount',
  'costMicrousd',
  'queueDelayMs',
]);
const SECRET =
  /(?:secret|token|authorization|cookie|password|credential|apiKey)/iu;
const PATH = /(?:path|filename|sourceLocator|resolved|candidate)/iu;
const TEXT = /(?:transcript|caption|prompt|response|message|word|text)/iu;
const secretValue = /(?:sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/u;
function redact(key: string, value: unknown): unknown {
  if (
    SAFE.has(key) &&
    (value === null || ['string', 'number', 'boolean'].includes(typeof value))
  )
    return value;
  if (
    SECRET.test(key) ||
    (typeof value === 'string' && secretValue.test(value))
  )
    return '[REDACTED_SECRET]';
  if (
    PATH.test(key) ||
    (typeof value === 'string' &&
      /(?:\/Users\/|file:\/\/|[A-Za-z]:\\)/u.test(value))
  )
    return '[REDACTED_PATH]';
  if (TEXT.test(key) || typeof value === 'string') return '[REDACTED_TEXT]';
  if (Array.isArray(value)) return value.map((item) => redact(key, item));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, redact(k, v)]),
    );
  return '[REDACTED_TEXT]';
}
export function redactDiagnosticRecord(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return redact('', input) as Record<string, unknown>;
}
