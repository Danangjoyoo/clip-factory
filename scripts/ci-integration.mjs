import { spawn } from 'node:child_process';

const marker = process.argv.indexOf('--');
if (marker < 0 || !process.argv[marker + 1])
  throw new Error('usage: ci-integration.mjs -- command args');
const project = process.env.COMPOSE_PROJECT_NAME ?? 'clip-factory-ci';
const files =
  (
    process.env.COMPOSE_FILES ??
    '-f infra/compose/docker-compose.yml -f infra/compose/docker-compose.ci.yml'
  ).match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
const compose = ['compose', '-p', project, ...files];
const command = (value) => {
  const parts =
    value
      ?.match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((part) => part.replace(/^"|"$/g, '')) ?? [];
  if (!parts.length) throw new Error('missing service command');
  return parts;
};
const run = (name, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(name, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${name} exited ${code ?? signal}`)),
    );
  });
const children = [];
const start = (value) => {
  const [name, ...args] = command(value);
  const child = spawn(name, args, { stdio: 'inherit', shell: false });
  children.push(child);
  return child;
};
const stop = async () => {
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }),
  );
};
try {
  await run('docker', [...compose, 'up', '-d', '--wait']);
  await run('pnpm', ['db:migrate:deploy']);
  if (process.env.WEB_COMMAND) start(process.env.WEB_COMMAND);
  if (process.env.WORKER_COMMAND) start(process.env.WORKER_COMMAND);
  await run(process.argv[marker + 1], process.argv.slice(marker + 2));
} finally {
  await stop();
  await run('docker', [...compose, 'down', '-v', '--remove-orphans']).catch(
    () => undefined,
  );
}
