import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { schemaBodies } from '../schema/schema-bodies.mjs';

const root = resolve(import.meta.dirname, '..');
const worker = resolve(root, '../../apps/worker');
const names = Object.keys(schemaBodies).sort();
await mkdir(resolve(root, 'schema'), { recursive: true });
await mkdir(resolve(root, 'src/generated'), { recursive: true });
await mkdir(
  resolve(worker, 'src/clip_factory/entrypoints/contracts/generated'),
  { recursive: true },
);
const manifest = {};
for (const name of names) {
  const schemaPath = resolve(root, `schema/${name}.schema.json`);
  const schemaText = `${JSON.stringify(schemaBodies[name], null, 2)}\n`;
  await writeFile(schemaPath, schemaText);
  manifest[name] = createHash('sha256').update(schemaText).digest('hex');
  if (name === 'common') continue;
  execFileSync(
    'pnpm',
    [
      'exec',
      'json2ts',
      '--input',
      schemaPath,
      '--output',
      resolve(root, `src/generated/${name}.ts`),
      '--bannerComment',
      '// Generated from Clip Factory contract 1.0.0. Do not edit.',
    ],
    { stdio: 'inherit' },
  );
  execFileSync(
    'uv',
    [
      'run',
      '--directory',
      worker,
      'datamodel-codegen',
      '--input',
      schemaPath,
      '--input-file-type',
      'jsonschema',
      '--output',
      resolve(
        worker,
        `src/clip_factory/entrypoints/contracts/generated/${name.replaceAll('-', '_')}.py`,
      ),
      '--output-model-type',
      'pydantic_v2.BaseModel',
      '--target-python-version',
      '3.12',
      '--disable-timestamp',
    ],
    { stdio: 'inherit' },
  );
}
execFileSync(
  'pnpm',
  [
    '--config.minimum-release-age=0',
    'exec',
    'prettier',
    '--write',
    resolve(root, 'schema'),
    resolve(root, 'src/generated'),
  ],
  { stdio: 'inherit' },
);
for (const name of names) {
  const schemaText = await readFile(
    resolve(root, `schema/${name}.schema.json`),
    'utf8',
  );
  manifest[name] = createHash('sha256').update(schemaText).digest('hex');
}
await writeFile(
  resolve(root, 'src/generated/manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  resolve(
    worker,
    'src/clip_factory/entrypoints/contracts/generated/manifest.json',
  ),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
