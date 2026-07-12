import { readFile } from 'node:fs/promises';

import { expect, it } from 'vitest';

it('imports exactly its repository and no service, controller, or client', async () => {
  const source = await readFile(
    'src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.ts',
    'utf8',
  );
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    '../ports/youtube-connection.repository',
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
  expect(
    imports.filter((path) => /\/(services|controllers?|clients?)\//.test(path)),
  ).toEqual([]);
});
