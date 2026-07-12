import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it.each([
  ['publication.data-service.ts', 'publication.repository'],
  ['publication-attempt.data-service.ts', 'publication-attempt.repository'],
] as const)('%s imports only %s', async (file, expectedRepository) => {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].flatMap(
    (match) => (match[1] ? [match[1]] : []),
  );
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    `../ports/${expectedRepository}`,
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
});
