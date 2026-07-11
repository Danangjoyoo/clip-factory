import { describe, expect, it } from 'vitest';
import invalid from '../test-fixtures/invalid-workflow.json';
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
    const base = {
      ...valid,
      mode: 'AI_HIGHLIGHTS',
      analysis: {
        modelId: 'gpt-5.5',
        reasoning: 'max',
        budgetMicrousd: 1,
        maximumClips: 1,
        instruction: null,
        coverageStartMs: 0,
        coverageEndMs: 1,
      },
    };
    expect(() => validateContract('workflow-input', base)).toThrow(/reasoning/);
    expect(
      validateContract('workflow-input', {
        ...base,
        analysis: { ...base.analysis, modelId: 'gpt-5.6-sol' },
      }),
    ).toEqual(expect.anything());
  });
});
