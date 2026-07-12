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

it('imports exactly its repository and no service, controller, or client', async () => {
  const source = await readFile(
    modulePath('youtube-connection.data-service.ts'),
    'utf8',
  );
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].flatMap(
    (match) => (typeof match[1] === 'string' ? [match[1]] : []),
  );
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    '../ports/youtube-connection.repository',
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
  expect(
    imports.filter((path) => /\/(services|controllers?|clients?)\//.test(path)),
  ).toEqual([]);
});
