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
    setupFiles: [
      fileURLToPath(new URL('./apps/web/src/test-setup.ts', import.meta.url)),
    ],
  },
});
