import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

const targets = process.argv.slice(2);
const root = resolve(targets[0] ?? 'apps/web/src');
const forbiddenProviders = {
  application: [
    '@prisma/client',
    'next',
    'react',
    'redis',
    '@aws-sdk',
    '@temporalio',
    'openai',
  ],
  domain: [
    '@prisma/client',
    'next',
    'react',
    'redis',
    '@aws-sdk',
    '@temporalio',
    'openai',
    'node:fs',
  ],
};

const files = [];
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.name === 'generated') continue;
    if (entry.isDirectory()) await visit(child);
    else if (['.ts', '.tsx'].includes(extname(child))) files.push(child);
  }
}

async function collect(path) {
  if ((await stat(path)).isDirectory()) return visit(path);
  if (['.ts', '.tsx'].includes(extname(path))) files.push(path);
}

for (const target of targets.length ? targets : ['apps/web/src']) {
  await collect(resolve(target));
}
let failed = false;
const sourceFiles = new Set(files);
const edges = new Map(files.map((file) => [file, []]));

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/(^|\s)\/\/.*$/gmu, '$1')
      .replace(/,\s*([}\]])/gu, '$1'),
  );
}

async function findConfig(start) {
  let current = start;
  while (true) {
    const candidate = join(current, 'tsconfig.json');
    try {
      await readFile(candidate, 'utf8');
      return candidate;
    } catch {
      const parent = dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

async function compilerOptions(configPath, seen = new Set()) {
  if (!configPath || seen.has(configPath)) return {};
  seen.add(configPath);
  const config = parseJsonc(await readFile(configPath, 'utf8'));
  const extendsPath = config.extends
    ? resolve(dirname(configPath), config.extends)
    : null;
  const basePath = extendsPath?.endsWith('.json')
    ? extendsPath
    : extendsPath
      ? `${extendsPath}.json`
      : null;
  const base = basePath
    ? await compilerOptions(basePath, seen).catch(() => ({}))
    : {};
  const current = config.compilerOptions ?? {};
  const baseUrl = current.baseUrl
    ? resolve(dirname(configPath), current.baseUrl)
    : base.baseUrl;
  return {
    ...base,
    ...current,
    paths: { ...(base.paths ?? {}), ...(current.paths ?? {}) },
    baseUrl,
    configDir: dirname(configPath),
  };
}

const configPath = await findConfig(
  (await stat(root)).isDirectory() ? root : dirname(root),
);
const options = configPath ? await compilerOptions(configPath) : {};
const baseUrl = options.baseUrl ?? resolve(options.configDir ?? root, '.');
const aliases = Object.entries(options.paths ?? {});

function resolveFile(candidate) {
  for (const path of [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.d.ts`,
    join(candidate, 'index.ts'),
    join(candidate, 'index.tsx'),
  ]) {
    if (sourceFiles.has(path)) return path;
  }
  return null;
}

function resolveAlias(specifier) {
  for (const [pattern, targets] of aliases) {
    const wildcard = pattern.indexOf('*');
    const prefix = wildcard === -1 ? pattern : pattern.slice(0, wildcard);
    const suffix = wildcard === -1 ? '' : pattern.slice(wildcard + 1);
    if (
      !specifier.startsWith(prefix) ||
      (suffix && !specifier.endsWith(suffix))
    ) {
      continue;
    }
    const end = suffix ? specifier.length - suffix.length : specifier.length;
    const matched = specifier.slice(prefix.length, end);
    for (const target of Array.isArray(targets) ? targets : [targets]) {
      const candidate = resolve(baseUrl, target.replace('*', matched));
      const resolved = resolveFile(candidate);
      if (resolved) return resolved;
    }
  }
  return null;
}

const layerOf = (file) =>
  file.match(
    /(?:^|\/)(domain|application|adapters|delivery|converters|composition)(?:\/|$)/u,
  )?.[1] ?? null;
const resolveImport = (file, specifier) => {
  if (specifier.startsWith('.')) {
    return resolveFile(resolve(dirname(file), specifier));
  }
  return resolveAlias(specifier);
};

const importPatterns = [
  /\b(?:import|export)\s+(?:(?:type\s+)?[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/gu,
  /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
];

function importsOf(source) {
  return importPatterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
}

function isProviderImport(layer, specifier) {
  return (forbiddenProviders[layer] ?? []).some(
    (provider) =>
      specifier === provider || specifier.startsWith(`${provider}/`),
  );
}

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const specifiers = importsOf(source);
  for (const specifier of specifiers) {
    if (
      specifier === 'googleapis' ||
      specifier.startsWith('googleapis/') ||
      specifier === 'google-auth-library' ||
      specifier.startsWith('google-auth-library/')
    ) {
      process.stderr.write(`Google SDK import is adapter-only: ${file}\n`);
      failed = true;
    }
  }
  if (
    /(?:^|\/)application\/ports(?:\/|$)/u.test(file) &&
    /export\s+(?:interface|type)\s+\w*RepositoryPort\b/u.test(source) &&
    /\b\w*Record(?:Dto)?\b/u.test(source)
  ) {
    process.stderr.write(
      `repository ports must use application Entity DTOs: ${file}\n`,
    );
    failed = true;
  }
  if (
    /(?:^|\/)(?:domain|application|delivery\/ui)(?:\/|$)/u.test(file) &&
    /\b(?:access_?token|refresh_?token|authorization_?code|code_?verifier|client_?secret)\b/iu.test(
      source,
    )
  ) {
    process.stderr.write(`credential field is boundary-forbidden: ${file}\n`);
    failed = true;
  }
  for (const layer of Object.keys(forbiddenProviders)) {
    if (!file.includes(`/${layer}/`)) continue;
    for (const specifier of specifiers) {
      if (!isProviderImport(layer, specifier)) continue;
      process.stderr.write(
        `${layer} in ${file} must not import ${specifier}\n`,
      );
      failed = true;
    }
  }
  for (const layer of ['application', 'domain']) {
    if (!file.includes(`/${layer}/`)) continue;
    for (const specifier of specifiers) {
      if (!/\/dto\/(?:api|record|client)\//u.test(specifier)) continue;
      process.stderr.write(
        `${layer} in ${file} must not import boundary DTO\n`,
      );
      failed = true;
    }
  }
  for (const specifier of specifiers) {
    const imported = resolveImport(file, specifier);
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
      ['adapters', 'delivery'].includes(from) &&
      ['adapters', 'delivery'].includes(to) &&
      from !== to
    ) {
      process.stderr.write(
        `${from} in ${file} must not import outer peer ${to}\n`,
      );
      failed = true;
    }
    if (['domain', 'application'].includes(from) && to === 'adapters') {
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
