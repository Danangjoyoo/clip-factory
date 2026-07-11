import { test, expect } from './fixtures/app';

test('browser upload exposes the same source contract', async ({ page }) => {
  await page.goto('/projects/new');
  await page.getByRole('tab', { name: 'Upload file' }).click();
  await expect(page.getByLabel('Video file')).toHaveAttribute(
    'accept',
    'video/*',
  );
  await expect(page.getByRole('tab', { name: 'Upload file' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
