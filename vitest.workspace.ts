import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: './apps/web/vitest.config.ts',
        test: {
          name: 'unit',
          include: ['apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
        },
      },
      {
        test: {
          name: 'integration',
          include: [
            'tests/integration/**/*.test.ts',
            'tests/integration/**/*.test.tsx',
          ],
          setupFiles: ['tests/integration/setup/env.ts'],
          globalSetup: ['tests/integration/setup/global-setup.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
