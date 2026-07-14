import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('wallpaper and flooring styles render and persist', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await page.locator('#welcome').evaluate((element) => element.classList.add('gone'));
  await page.locator('#open-room').evaluate((button: HTMLButtonElement) => button.click());

  await expect(page.locator('[data-wall-style]')).toHaveCount(8);
  await expect(page.locator('[data-floor-style]')).toHaveCount(8);
  await page.locator('[data-wall-style="botanical"]').click();
  await page.locator('[data-floor-style="herringbone"]').click();
  await page.locator('[data-wall-color="#b9c5ad"]').click();
  await page.locator('[data-floor-color="#b38255"]').click();

  await expect(page.locator('[data-wall-style="botanical"]')).toHaveClass(/active/);
  await expect(page.locator('[data-floor-style="herringbone"]')).toHaveClass(/active/);
  const settings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('my-little-room-settings-v1') ?? '{}'),
  );
  expect(settings.wallStyle).toBe('botanical');
  expect(settings.floorStyle).toBe('herringbone');
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.renderer.textures ?? 0))
    .toBeGreaterThanOrEqual(2);

  if (!testInfo.project.name.includes('mobile')) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#save-xml').evaluate((button: HTMLButtonElement) => button.click());
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const xml = await readFile(path!, 'utf8');
    expect(xml).toContain('wall-style="botanical"');
    expect(xml).toContain('floor-style="herringbone"');
  }

  await testInfo.attach(`${testInfo.project.name}-room-finishes`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
