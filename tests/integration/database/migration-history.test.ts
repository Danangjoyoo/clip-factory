import { describe, expect, it } from 'vitest';
import { applyMigrations, normalizedSchemaHash } from '../support/postgres';
import { integrationEnabled } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('migration history', () => { it('is repeatable and produces a stable schema', async () => { await applyMigrations(); const first = await normalizedSchemaHash(); await applyMigrations(); expect(await normalizedSchemaHash()).toBe(first); }); });
