import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  await readFile(resolve(root, 'src/generated/manifest.json'), 'utf8'),
);
for (const [name, digest] of Object.entries(manifest)) {
  const text = await readFile(
    resolve(root, `schema/${name}.schema.json`),
    'utf8',
  );
  const { createHash } = await import('node:crypto');
  if (createHash('sha256').update(text).digest('hex') !== digest)
    throw new Error(`Generated contract is stale: ${name}`);
  const schema = JSON.parse(text);
  if (!schema.$id?.endsWith('/1.0.0'))
    throw new Error(`Contract ${name} must remain versioned`);
  if (name !== 'common' && schema.additionalProperties !== false)
    throw new Error(`Contract ${name} must reject unknown properties`);
}
