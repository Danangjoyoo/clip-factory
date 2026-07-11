import { describe, expect, it } from 'vitest';
import { CONTRACTS_PACKAGE } from './index';

describe('contracts package bootstrap', () => {
  it('exports a loadable package sentinel', () => {
    expect(CONTRACTS_PACKAGE).toBe(true);
  });
});
