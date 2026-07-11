import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'apps/web/src');
const forbidden = [
  [
    'application',
    /from ['"]((?:@prisma\/client|next|react|redis|@aws-sdk(?:\/[^'"]+)?|@temporalio(?:\/[^'"]+)?|openai(?:\/[^'"]+)?))['"]/,
  ],
  [
    'domain',
    /from ['"]((?:@prisma\/client|next|react|redis|@aws-sdk(?:\/[^'"]+)?|@temporalio(?:\/[^'"]+)?|openai(?:\/[^'"]+)?|node:fs))['"]/,
  ],
];
const boundaryDto = /from ['"][^'"]*\/dto\/(?:api|record|client)\//;

const files = [];
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await visit(child);
    else if (['.ts', '.tsx'].includes(extname(child))) files.push(child);
  }
}

await visit(root);
let failed = false;
const sourceFiles = new Set(files);
const edges = new Map(files.map((file) => [file, []]));
const importPattern = /(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/gu;
const layerOf = (file) =>
  file.match(
    /(?:^|\/)(domain|application|adapters|delivery|converters|composition)(?:\/|$)/u,
  )?.[1] ?? null;
const resolveRelative = (file, specifier) => {
  const base = resolve(dirname(file), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (sourceFiles.has(candidate)) return candidate;
  }
  return null;
};

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const [layer, pattern] of forbidden) {
    if (!file.includes(`/${layer}/`)) continue;
    const match = source.match(pattern);
    if (match) {
      process.stderr.write(`${layer} in ${file} must not import ${match[1]}\n`);
      failed = true;
    }
  }
  for (const layer of ['application', 'domain']) {
    if (file.includes(`/${layer}/`) && boundaryDto.test(source)) {
      process.stderr.write(
        `${layer} in ${file} must not import boundary DTO\n`,
      );
      failed = true;
    }
  }
  for (const match of source.matchAll(importPattern)) {
    const imported = resolveRelative(file, match[1]);
    if (imported) edges.get(file).push(imported);
  }
}

for (const [file, imports] of edges) {
  const from = layerOf(file);
  for (const imported of imports) {
    const to = layerOf(imported);
    if (!from || !to) continue;
    if (
      (from === 'domain' || from === 'application') &&
      ['adapters', 'delivery', 'converters', 'composition'].includes(to)
    ) {
      process.stderr.write(
        `${from} in ${file} must not import outer layer ${to}\n`,
      );
      failed = true;
    }
    if (from === 'domain' && to === 'application') {
      process.stderr.write(`domain in ${file} must not import application\n`);
      failed = true;
    }
    if (
      ['adapters', 'delivery', 'converters'].includes(from) &&
      ['adapters', 'delivery', 'converters'].includes(to) &&
      from !== to
    ) {
      process.stderr.write(
        `${from} in ${file} must not import outer peer ${to}\n`,
      );
      failed = true;
    }
    if (from !== 'composition' && to === 'adapters') {
      process.stderr.write(
        `${from} in ${file} must not import concrete adapter\n`,
      );
      failed = true;
    }
  }
}

const visiting = new Set();
const visited = new Set();
const stack = [];
function visitGraph(file) {
  if (visiting.has(file)) {
    process.stderr.write(`cycle detected: ${[...stack, file].join(' -> ')}\n`);
    failed = true;
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  stack.push(file);
  for (const imported of edges.get(file) ?? []) visitGraph(imported);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) visitGraph(file);

process.exitCode = failed ? 1 : 0;
