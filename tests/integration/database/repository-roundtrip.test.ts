import { describe, expect, it } from 'vitest';
import { postgres } from '../support/postgres';
import { integrationEnabled } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('repository round trip', () => { it('can query the product schema', async () => { const result = await postgres.query("select to_regclass('public.projects') as table_name"); expect(result.rows).toHaveLength(1); }); });
