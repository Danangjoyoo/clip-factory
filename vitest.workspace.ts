import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        oxc: {
          jsx: {
            runtime: 'automatic',
          },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./apps/web/src/test-setup.ts'],
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
        },
      },
    ],
  },
});
