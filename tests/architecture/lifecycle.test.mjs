import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { shutdown } from '../../scripts/dev.mjs';

test('shutdown terminates worker before compose', async () => {
  const events = [];
  const worker = new EventEmitter();
  worker.exitCode = null;
  worker.signalCode = null;
  worker.kill = (signal) => {
    events.push(`worker:${signal}`);
    worker.exitCode = 0;
    worker.emit('exit', 0);
  };
  await shutdown(
    worker,
    async () => events.push('compose:down'),
    'SIGTERM',
    20,
  );
  assert.deepEqual(events, ['worker:SIGTERM', 'compose:down']);
});

test('shutdown force kills a stubborn worker', async () => {
  const events = [];
  const worker = new EventEmitter();
  worker.exitCode = null;
  worker.signalCode = null;
  worker.kill = (signal) => {
    events.push(`worker:${signal}`);
    if (signal === 'SIGKILL') worker.emit('exit', null);
  };
  await shutdown(worker, async () => events.push('compose:down'), 'SIGTERM', 1);
  assert.deepEqual(events, [
    'worker:SIGTERM',
    'worker:SIGKILL',
    'compose:down',
  ]);
});
