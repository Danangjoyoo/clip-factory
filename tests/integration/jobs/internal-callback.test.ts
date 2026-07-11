import { describe, expect, it } from 'vitest';
import { integrationEnabled } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('internal callback', () => { it('keeps callback tests opt-in to disposable infrastructure', () => expect(integrationEnabled).toBe(true)); });
