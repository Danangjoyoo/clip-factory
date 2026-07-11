import { expect, it } from 'vitest';
import { toPrismaJsonInput } from './prisma-json.converter';

it('preserves JSON values and omits undefined object properties', () => {
  const value = {
    nullValue: null,
    text: 'ok',
    enabled: true,
    count: 2,
    nested: [null, 'x'],
    omitted: undefined,
  };
  expect(toPrismaJsonInput(value)).toEqual({
    nullValue: null,
    text: 'ok',
    enabled: true,
    count: 2,
    nested: [null, 'x'],
  });
});

it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'rejects non-finite number %s',
  (value) => {
    expect(() => toPrismaJsonInput({ value })).toThrow(
      'JSON metadata numbers must be finite',
    );
  },
);

it.each([
  new Date(),
  Buffer.from('data'),
  new (class Example {
    value = 'x';
  })(),
])('rejects non-plain object %o', (value) => {
  expect(() => toPrismaJsonInput(value)).toThrow(
    'JSON metadata must contain only JSON-compatible values',
  );
});

it('preserves objects with a null prototype', () => {
  const value = Object.create(null) as Record<string, unknown>;
  value.answer = 42;
  expect(toPrismaJsonInput(value)).toEqual({ answer: 42 });
});
