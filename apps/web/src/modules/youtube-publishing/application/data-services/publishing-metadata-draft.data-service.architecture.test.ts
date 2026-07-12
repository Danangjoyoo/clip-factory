import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('imports one application repository port and no adapter', async () => {
  const source = await readFile(
    resolve(
      process.cwd(),
      'src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.ts',
    ),
    'utf8',
  );
  expect(source).toContain(
    "from '../ports/publishing-metadata-draft.repository'",
  );
  expect(source).not.toMatch(/from ['"].*\/adapters\//u);
});
