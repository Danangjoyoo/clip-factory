import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { AnySchema } from 'ajv';
import common from '../schema/common.schema.json';
import costData from '../schema/cost-data.schema.json';
import error from '../schema/error.schema.json';
import highlightResponse from '../schema/highlight-response.schema.json';
import mediaProbe from '../schema/media-probe.schema.json';
import progressEvent from '../schema/progress-event.schema.json';
import renderSpec from '../schema/render-spec.schema.json';
import transcript from '../schema/transcript.schema.json';
import workerHealth from '../schema/worker-health.schema.json';
import workflowInput from '../schema/workflow-input.schema.json';
import workflowResult from '../schema/workflow-result.schema.json';
import youtubePublishing from '../schema/youtube-publishing.schema.json';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(common as AnySchema);
const entries = {
  'cost-data': costData,
  error,
  'highlight-response': highlightResponse,
  'media-probe': mediaProbe,
  'progress-event': progressEvent,
  'render-spec': renderSpec,
  transcript,
  'worker-health': workerHealth,
  'workflow-input': workflowInput,
  'workflow-result': workflowResult,
  'youtube-publishing': youtubePublishing,
} as const;
for (const schema of Object.values(entries)) ajv.addSchema(schema as AnySchema);
const validators = new Map(
  Object.entries(entries).map(([name, schema]) => [
    name,
    ajv.compile(schema as AnySchema),
  ]),
);

export function validateContract(name: string, value: unknown): unknown {
  const validate = validators.get(name);
  if (!validate) throw new Error(`Unknown contract: ${name}`);
  if (!validate(value))
    throw new Error(ajv.errorsText(validate.errors, { separator: '; ' }));
  return value;
}

export class ContractValidationError extends Error {
  constructor(errors: Parameters<typeof ajv.errorsText>[0]) {
    super(ajv.errorsText(errors, { separator: '; ' }));
    this.name = 'ContractValidationError';
  }
}

export function validateContractDefinition<T>(
  schemaName: string,
  definitionName: string,
  value: unknown,
): T {
  const validate = ajv.getSchema(
    `https://clip-factory.local/contracts/${schemaName}/1.0.0#/$defs/${definitionName}`,
  );
  if (!validate)
    throw new Error(
      `unknown contract definition ${schemaName}.${definitionName}`,
    );
  if (!validate(value)) {
    if (
      schemaName === 'youtube-publishing' &&
      definitionName === 'publicationWorkflowInputV1' &&
      (value as { visibility?: unknown }).visibility === 'SCHEDULED'
    ) {
      throw new Error(
        'scheduled publication requires scheduleAtUtc and sourceTimezone',
      );
    }
    throw new ContractValidationError(validate.errors ?? []);
  }
  return value as T;
}
