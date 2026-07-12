import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'apps/web/src/**/*.test.ts',
      'apps/web/src/**/*.test.tsx',
      'packages/*/src/**/*.test.ts',
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    exclude: ['**/.worktrees/**', 'tests/**'],
    setupFiles: [
      fileURLToPath(new URL('./apps/web/src/test-setup.ts', import.meta.url)),
    ],
  },
});
