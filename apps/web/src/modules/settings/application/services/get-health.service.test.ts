import { describe, expect, it } from 'vitest'; import { GetHealthService } from './get-health.service';
describe('health', () => { it('aggregates checks', async () => { const result = await new GetHealthService([{ component: 'db', check: async () => ({ status: 'HEALTHY' }) }]).execute(); expect(result.status).toBe('HEALTHY'); }); });
