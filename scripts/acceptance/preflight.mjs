import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import net from 'node:net';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const manifest = new URL(
  '../../tests/fixtures/acceptance/manifest.json',
  import.meta.url,
);
const manifestData = JSON.parse(await readFile(manifest, 'utf8'));
const required = [
  ['docker', ['--version']],
  ['docker compose', ['compose', 'version']],
  ['uv', ['--version']],
  ['python', ['--version']],
  ['ffmpeg', ['-version']],
  ['ffprobe', ['-version']],
];
const command = (name, args) =>
  spawnSync(
    name.split(' ')[0],
    name.includes(' ') ? ['compose', ...args] : args,
    { encoding: 'utf8' },
  );
const readableFile = async (value, label) => {
  if (!value)
    throw new Error(`${label} is not set (set the path to a local file)`);
  const info = await stat(value).catch(() => null);
  if (!info?.isFile() || info.size === 0)
    throw new Error(`${label} must be a readable regular file`);
  await access(value, constants.R_OK);
};
const portFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
export async function preflight({ env = process.env } = {}) {
  if (process.arch !== 'arm64' || process.platform !== 'darwin')
    throw new Error('Apple Silicon macOS (arm64) is required');
  const failures = [];
  for (const [name, args] of required) {
    const result = command(name, args);
    if (result.status !== 0) failures.push(name);
  }
  if (failures.length)
    throw new Error(`Missing native dependencies: ${failures.join(', ')}`);
  await readableFile(
    env.CLIP_FACTORY_ACCEPTANCE_SAMPLE,
    'CLIP_FACTORY_ACCEPTANCE_SAMPLE',
  );
  const occupied = (
    await Promise.all(
      manifestData.ports.map(async (port) =>
        (await portFree(port)) ? null : port,
      ),
    )
  ).filter(Boolean);
  if (occupied.length)
    throw new Error(`Ports unavailable: ${occupied.join(', ')}`);
  await readableFile(
    env.CLIP_FACTORY_ACCEPTANCE_MAX_SOURCE,
    'CLIP_FACTORY_ACCEPTANCE_MAX_SOURCE',
  );
  if (env.OPENAI_SMOKE === '1' && !env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required only when OPENAI_SMOKE=1');
  return { ok: true, manifest: manifest.pathname };
}
if (import.meta.url === `file://${process.argv[1]}`)
  preflight()
    .then(() => console.log('acceptance preflight: PASS'))
    .catch((error) => {
      console.error(`acceptance preflight: FAIL — ${error.message}`);
      process.exitCode = 1;
    });
