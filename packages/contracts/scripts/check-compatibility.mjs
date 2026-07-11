import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function majorVersion(id) {
  const match = /\/(\d+)\.\d+\.\d+$/.exec(id ?? '');
  return match ? Number(match[1]) : 0;
}

function typeSet(type) {
  return new Set(Array.isArray(type) ? type : type ? [type] : []);
}

function compareNode(previous, current, path) {
  if (!previous || !current) return;
  const previousTypes = typeSet(previous.type);
  const currentTypes = typeSet(current.type);
  if (previousTypes.size && currentTypes.size) {
    for (const type of currentTypes)
      if (!previousTypes.has(type))
        throw new Error(
          `${path}: type narrowed from ${[...previousTypes]} to ${[...currentTypes]}`,
        );
  }
  if (Array.isArray(previous.enum) && Array.isArray(current.enum)) {
    for (const value of previous.enum)
      if (!current.enum.includes(value))
        throw new Error(`${path}: enum value removed: ${value}`);
  }
  for (const field of previous.required ?? [])
    if (!(current.required ?? []).includes(field))
      throw new Error(`${path}: required field removed: ${field}`);
  for (const [name, previousChild] of Object.entries(previous.properties ?? {}))
    compareNode(previousChild, current.properties?.[name], `${path}.${name}`);
  compareNode(previous.items, current.items, `${path}[]`);
  for (const [name, previousDef] of Object.entries(previous.$defs ?? {}))
    compareNode(previousDef, current.$defs?.[name], `${path}.$defs.${name}`);
}

export function assertBackwardCompatible(previous, current) {
  if (majorVersion(previous.$id) === majorVersion(current.$id))
    compareNode(previous, current, current.$id ?? 'schema');
}

async function main(previousDir = process.env.COMPATIBILITY_PREVIOUS_DIR) {
  const root = resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(
    await readFile(resolve(root, 'src/generated/manifest.json'), 'utf8'),
  );
  for (const [name, digest] of Object.entries(manifest)) {
    const currentPath = resolve(root, `schema/${name}.schema.json`);
    const text = await readFile(currentPath, 'utf8');
    if (
      createHash('sha256')
        .update(JSON.stringify(JSON.parse(text)))
        .digest('hex') !== digest
    )
      throw new Error(`Generated contract is stale: ${name}`);
    const current = JSON.parse(text);
    if (!current.$id?.endsWith('/1.0.0'))
      throw new Error(`Contract ${name} must remain versioned`);
    if (name !== 'common' && current.additionalProperties !== false)
      throw new Error(`Contract ${name} must reject unknown properties`);
    if (previousDir) {
      const previous = JSON.parse(
        await readFile(resolve(previousDir, `${name}.schema.json`), 'utf8'),
      );
      assertBackwardCompatible(previous, current);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv[2]);
