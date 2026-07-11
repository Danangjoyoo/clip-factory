import type { FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  if (process.env.CI && !process.env.PLAYWRIGHT_BASE_URL) {
    throw new Error(
      'CI E2E requires PLAYWRIGHT_BASE_URL from the managed app fixture',
    );
  }
}
