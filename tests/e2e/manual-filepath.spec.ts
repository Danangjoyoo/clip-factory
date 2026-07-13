import { test, expect } from './fixtures/app';

test('manual filepath configuration accepts clip limits', async ({
  page,
  app,
}) => {
  await app.seedLocalSource('talking-head.mp4');
  await page.goto('/projects/new');
  await page.getByLabel('Project name').fill('Manual interview');
  const localPathTab = page.getByRole('tab', { name: 'Local filepath' });
  await expect(async () => {
    await localPathTab.click();
    await expect(localPathTab).toHaveAttribute('aria-selected', 'true');
  }).toPass();
  await page
    .getByLabel('Video filepath')
    .fill(app.localSourcePath('talking-head.mp4'));
  await page.getByLabel('AI-assisted mode').selectOption('MANUAL');
  await expect(
    page.getByText(
      'No OpenAI calls. Clip selection, metadata, and publishing details are manual.',
    ),
  ).toBeVisible();
  await page.getByLabel('Maximum clips').fill('3');
  await page.getByLabel('Maximum clip length (seconds)').fill('45');
  await expect(
    page.getByRole('button', { name: 'Create project' }),
  ).toBeEnabled();
});
