import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/app';

test('projects and processing pages have no serious accessibility violations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Projects' })).toBeVisible();
  const projects = await new AxeBuilder({ page }).analyze();
  expect(
    projects.violations.filter(
      ({ impact }) => impact === 'critical' || impact === 'serious',
    ),
  ).toEqual([]);

  await page.goto('/projects/demo/processing');
  await expect(page.getByRole('main')).toBeVisible();
  const processing = await new AxeBuilder({ page }).analyze();
  expect(
    processing.violations.filter(
      ({ impact }) => impact === 'critical' || impact === 'serious',
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
