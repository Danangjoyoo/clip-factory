import { test, expect } from './fixtures/app';

test('projects library has a stable empty state and source entry point', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Projects' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'New project' }).first(),
  ).toHaveAttribute('href', '/projects/new');
});
