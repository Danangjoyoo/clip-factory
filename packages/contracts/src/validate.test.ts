import { describe, expect, it } from 'vitest';
import invalid from '../test-fixtures/invalid-workflow.json';
import invalidReasoning from '../test-fixtures/invalid-reasoning-workflow.json';
import valid from '../test-fixtures/valid-workflow.json';
import { validateContract } from './validate';

describe('validateContract', () => {
  it('accepts the versioned workflow input fixture', () =>
    expect(validateContract('workflow-input', valid)).toEqual(valid));
  it('rejects unknown modes and additional properties', () =>
    expect(() => validateContract('workflow-input', invalid)).toThrow(
      /mode|additionalProperties/,
    ));
  it('enforces model reasoning compatibility', () => {
    expect(() => validateContract('workflow-input', invalidReasoning)).toThrow(
      /reasoning/,
    );
    expect(
      validateContract('workflow-input', {
        ...invalidReasoning,
        analysis: { ...invalidReasoning.analysis, modelId: 'gpt-5.6-sol' },
      }),
    ).toEqual(expect.anything());
  });
});
