import { expect, it } from 'vitest';
import { RedisLiveProjectionAdapter } from './redis-live-projection.adapter';

const event = {
  projectId: 'p',
  workflowId: 'w',
  stage: 'X',
  progressBasisPoints: 1,
  eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' as const },
  completedUnits: 1,
  totalUnits: 2,
  unit: 'ITEMS',
  occurredAt: new Date().toISOString(),
};

function fakeClient() {
  const values = new Map<string, string>();
  const messages: Array<[string, Record<string, string>]> = [];
  const calls: Array<{ name: string; args: unknown[] }> = [];
  return {
    values,
    messages,
    calls,
    isOpen: false,
    connect: async () => {},
    set: async (key: string, value: string, options: unknown) => {
      calls.push({ name: 'set', args: [key, options] });
      values.set(key, value);
    },
    get: async (key: string) => values.get(key) ?? null,
    xAdd: async (_key: string, _id: string, fields: Record<string, string>) => {
      messages.push([`${messages.length + 1}-0`, fields]);
    },
    xTrim: async (...args: unknown[]) => {
      calls.push({ name: 'xTrim', args });
    },
    xRead: async () =>
      messages.length
        ? [
            {
              messages: messages
                .splice(0)
                .map(([id, fields]) => ({ id, message: fields })),
            },
          ]
        : null,
  } as never;
}

it('reconnects, persists a 24h snapshot, trims the stream, and replays IDs', async () => {
  const client = fakeClient();
  const adapter = new RedisLiveProjectionAdapter(client);
  await adapter.publish('p', event);
  expect((client as any).calls).toEqual([
    { name: 'set', args: ['progress:p', { EX: 86400 }] },
    { name: 'xTrim', args: ['progress-events:p', 'MAXLEN', 1000] },
  ]);
  expect(await adapter.snapshot('p')).toEqual(event);
  const rows = [];
  for await (const row of adapter.events(
    'p',
    '0-0',
    new AbortController().signal,
  )) {
    rows.push(row);
    break;
  }
  expect(rows[0]?.id).toBe('1-0');
});

it('stops on abort without waiting for another event', async () => {
  const client = fakeClient();
  const adapter = new RedisLiveProjectionAdapter(client);
  const controller = new AbortController();
  controller.abort();
  const rows = [];
  for await (const row of adapter.events('p', '0-0', controller.signal))
    rows.push(row);
  expect(rows).toEqual([]);
});
