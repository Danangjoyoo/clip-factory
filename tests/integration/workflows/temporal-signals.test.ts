import { describe, expect, it } from 'vitest';
import { temporalHealth } from '../support/temporal';
import { integrationEnabled } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('temporal', () => { it('is reachable', async () => { expect(await temporalHealth()).toBe(true); }); });
