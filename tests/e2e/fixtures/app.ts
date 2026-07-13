import { test as base, expect } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type E2EApp = {
  seedLocalSource(name: string): Promise<void>;
  localSourcePath(name: string): string;
};

export const test = base.extend<{ app: E2EApp }>({
  app: async ({}, use) => {
    const root = await mkdtemp(join(tmpdir(), 'clip-factory-e2e-'));
    const sources = new Set<string>();
    const app: E2EApp = {
      async seedLocalSource(name) {
        await writeFile(
          join(root, name),
          Buffer.from('synthetic media fixture'),
        );
        sources.add(name);
      },
      localSourcePath(name) {
        if (!sources.has(name))
          throw new Error(`Source was not seeded: ${name}`);
        return join(root, name);
      },
    };
    try {
      await use(app);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
});

export { expect };
