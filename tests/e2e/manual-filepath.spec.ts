import { test, expect } from './fixtures/app';

test('manual filepath keeps the zero-cost mode and accepts clip limits', async ({
  page,
  app,
}) => {
  await app.seedLocalSource('talking-head.mp4');
  await page.goto('/projects/new');
  await page.getByLabel('Project name').fill('Manual interview');
  await page
    .getByLabel('Video filepath')
    .fill(app.localSourcePath('talking-head.mp4'));
  await page
    .getByRole('checkbox', { name: 'Discover highlights with OpenAI' })
    .uncheck();
  await expect(page.getByText('No cloud AI / no API cost')).toBeVisible();
  await page.getByLabel('Maximum clips').fill('3');
  await page.getByLabel('Maximum clip length (seconds)').fill('45');
  await expect(
    page.getByRole('button', { name: 'Create project' }),
  ).toBeEnabled();
  expect(await app.openAIUsageCount()).toBe(0);
});
