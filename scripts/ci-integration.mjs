import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const marker = process.argv.indexOf('--');
if (marker < 0 || !process.argv[marker + 1])
  throw new Error('usage: ci-integration.mjs -- command args');
const project = process.env.COMPOSE_PROJECT_NAME ?? 'clip-factory-ci';
const envFile = process.env.COMPOSE_ENV_FILE ?? '.env.example';
const files =
  (
    process.env.COMPOSE_FILES ??
    '-f infra/compose/docker-compose.yml -f infra/compose/docker-compose.ci.yml'
  ).match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
const compose = ['compose', '--env-file', envFile, '-p', project, ...files];
const services =
  (process.env.COMPOSE_SERVICES ?? 'postgres redis minio temporal').match(
    /(?:[^\s"]+|"[^"]*")+/g,
  ) ?? [];
const envDefaults = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
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
const output = (name, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(name, args, { shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(new Error(`${name} exited ${code ?? signal}: ${stderr}`)),
    );
  });
const hostPort = async (service, port) => {
  const value = await output('docker', [...compose, 'port', service, port]);
  const match = value.match(/^(.*):(\d+)$/);
  if (!match) throw new Error(`invalid port mapping for ${service}:${port}`);
  return { host: match[1], port: match[2] };
};
const setServiceEnv = async () => {
  for (const [key, value] of Object.entries(envDefaults)) {
    process.env[key] ??= value;
  }
  const postgres = await hostPort('postgres', '5432');
  const redis = await hostPort('redis', '6379');
  const minio = await hostPort('minio', '9000');
  const temporal = await hostPort('temporal', '7233');
  const postgresContainer = await output('docker', [
    ...compose,
    'ps',
    '-q',
    'postgres',
  ]);
  process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${postgres.host}:${postgres.port}/${process.env.POSTGRES_DB}`;
  process.env.REDIS_URL = `redis://${redis.host}:${redis.port}/0`;
  process.env.MINIO_ENDPOINT = `http://${minio.host}:${minio.port}`;
  process.env.MINIO_PUBLIC_ENDPOINT = process.env.MINIO_ENDPOINT;
  process.env.TEMPORAL_ADDRESS = `${temporal.host}:${temporal.port}`;
  process.env.PG_DUMP_CONTAINER = postgresContainer;
};
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
  await run('docker', [...compose, 'up', '-d', '--wait', ...services]);
  await run('docker', [...compose, 'run', '--rm', 'minio-init']);
  await setServiceEnv();
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
