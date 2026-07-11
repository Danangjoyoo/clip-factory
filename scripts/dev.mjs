import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export async function shutdown(
  worker,
  run,
  signal = 'SIGTERM',
  waitMs = 15000,
) {
  let exited = worker.exitCode !== null || worker.signalCode !== null;
  const exit = exited
    ? Promise.resolve()
    : new Promise((resolve) => worker.once('exit', resolve));
  if (!exited) worker.kill(signal);
  if (
    await Promise.race([exit.then(() => false), delay(waitMs).then(() => true)])
  ) {
    worker.kill('SIGKILL');
    await exit;
  }
  await run(['down']);
}

export async function start({
  spawnProcess = spawn,
  run = (args) =>
    new Promise((resolve, reject) => {
      const child = spawnProcess(
        'docker',
        [
          'compose',
          '--env-file',
          '.env',
          '-f',
          'infra/compose/docker-compose.yml',
          ...args,
        ],
        { stdio: 'inherit', shell: false },
      );
      child.once('error', reject);
      child.once('exit', (code) => {
        // ponytail: Compose returns 1 when the successful one-shot minio-init exits; core services are health-gated.
        code === 0 || args.includes('--wait') && code === 1
          ? resolve()
          : reject(new Error(`docker exited ${code}`));
      });
    }),
  preflight = () => import('./preflight.mjs').then(({ check }) => check()),
  waitMs = 15000,
} = {}) {
  await preflight();
  await run(['up', '-d', '--wait']);
  const worker = spawnProcess(
    '.tools/bin/uv',
    ['run', '--directory', 'apps/worker', 'python', '-m', 'clip_factory.entrypoints.temporal.worker'],
    {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, PYTHONPATH: `${process.cwd()}/apps/worker/src` },
    },
  );
  let stopping = false;
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    await shutdown(worker, run, signal, waitMs);
  };
  process.once('SIGINT', () => void stop('SIGTERM'));
  process.once('SIGTERM', () => void stop('SIGTERM'));
  worker.once('exit', (code) => {
    if (!stopping)
      void stop('SIGTERM').then(() => {
        process.exitCode = code ?? 1;
      });
  });
  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) await start();
