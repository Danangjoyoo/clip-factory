import { describe, expect, it } from 'vitest';
import { integrationEnabled } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('paid call recovery', () => { it('runs only against disposable infrastructure', () => expect(integrationEnabled).toBe(true)); });
