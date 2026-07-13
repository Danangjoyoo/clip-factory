import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const modulePath = (file: string) =>
  resolve(
    process.cwd(),
    process.cwd().endsWith('apps/web')
      ? `src/modules/youtube-publishing/application/data-services/${file}`
      : `apps/web/src/modules/youtube-publishing/application/data-services/${file}`,
  );

it.each([
  ['publication.data-service.ts', 'publication.repository'],
  ['publication-attempt.data-service.ts', 'publication-attempt.repository'],
] as const)('%s imports only %s', async (file, expectedRepository) => {
  const source = await readFile(modulePath(file), 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].flatMap(
    (match) => (match[1] ? [match[1]] : []),
  );
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    `../ports/${expectedRepository}`,
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
});
