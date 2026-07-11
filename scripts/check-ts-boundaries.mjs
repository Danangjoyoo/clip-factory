import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.argv[2] ?? 'apps/web/src';
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
}
process.exitCode = failed ? 1 : 0;
