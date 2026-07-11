import { describe, expect, it } from 'vitest';
import { assertBackwardCompatible } from './check-compatibility.mjs';

const base = {
  $id: 'https://clip-factory.local/contracts/example/1.0.0',
  type: 'object',
  required: ['name', 'kind'],
  properties: {
    name: { type: 'string' },
    kind: { enum: ['A', 'B'] },
  },
};

describe('schema compatibility', () => {
  it('rejects required-field removal, enum narrowing, and type narrowing', () => {
    expect(() =>
      assertBackwardCompatible(base, { ...base, required: ['name'] }),
    ).toThrow(/required field removed/);
    expect(() =>
      assertBackwardCompatible(base, {
        ...base,
        properties: { ...base.properties, kind: { enum: ['A'] } },
      }),
    ).toThrow(/enum value removed/);
    expect(() =>
      assertBackwardCompatible(base, {
        ...base,
        properties: { ...base.properties, name: { type: 'number' } },
      }),
    ).toThrow(/type narrowed/);
  });

  it('allows incompatible changes after a major version bump', () => {
    expect(() =>
      assertBackwardCompatible(base, {
        ...base,
        $id: base.$id.replace('/1.0.0', '/2.0.0'),
        required: [],
      }),
    ).not.toThrow();
  });
});
