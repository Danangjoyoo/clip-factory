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
  manifest[name] = createHash('sha256')
    .update(JSON.stringify(schemaBodies[name]))
    .digest('hex');
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
  if (name === 'workflow-input' || name === 'cost-data') {
    const className = name === 'workflow-input' ? 'Analysis' : 'CostData';
    const generatedPath = resolve(
      worker,
      `src/clip_factory/entrypoints/contracts/generated/${name.replaceAll('-', '_')}.py`,
    );
    const generated = await readFile(generatedPath, 'utf8');
    const withValidatorImport = generated.replace(
      'from pydantic import ',
      'from pydantic import model_validator, ',
    );
    const validator = [
      '',
      "    @model_validator(mode='after')",
      `    def validate_reasoning_compatibility(self) -> ${className}:`,
      '        if self.modelId is ModelId.gpt_5_5 and self.reasoning is Reasoning.max:',
      '            raise ValueError("reasoning \'max\' is not supported by gpt-5.5")',
      '        return self',
      '',
    ].join('\n');
    const output =
      name === 'workflow-input'
        ? withValidatorImport.replace(
            '\n\nclass WorkflowInput',
            `${validator}\nclass WorkflowInput`,
          )
        : `${withValidatorImport}${validator}`;
    await writeFile(generatedPath, output, 'utf8');
    execFileSync(
      'uv',
      ['run', '--directory', worker, 'ruff', 'format', generatedPath],
      { stdio: 'inherit' },
    );
  }
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
  manifest[name] = createHash('sha256')
    .update(JSON.stringify(JSON.parse(schemaText)))
    .digest('hex');
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
