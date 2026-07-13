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

it('imports one application repository port and no adapter', async () => {
  const source = await readFile(
    modulePath('publishing-metadata-draft.data-service.ts'),
    'utf8',
  );
  expect(source).toContain(
    "from '../ports/publishing-metadata-draft.repository'",
  );
  expect(source).not.toMatch(/from ['"].*\/adapters\//u);
});
