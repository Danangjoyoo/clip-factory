import { describe, expect, it } from 'vitest';
import { decimalToMicros } from './focal-point.converter';

describe('decimalToMicros', () => {
  it('rounds half up at six decimal places', () => {
    expect(decimalToMicros('0.2500005')).toBe(250001);
    expect(() => decimalToMicros('1.1')).toThrow('INVALID_FOCAL_POINT');
  });
});
