import { expect, test } from '@playwright/test';
import { clickRoomTool, enterRoom } from './helpers';

test('twenty consecutive iOS-class photo captures reuse the pipeline without errors', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'The mobile WebKit project is the iOS-class capture gate.');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await enterRoom(page);
  await clickRoomTool(page, '#open-photo');
  await expect(page.locator('#photo-status')).toContainText('Current view captured');
  const preview = page.locator('#photo-preview');
  const dimensions = await preview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);
  for (let capture = 1; capture < 20; capture += 1) {
    const previous = await preview.getAttribute('src');
    await page.locator('#retake-photo').click();
    await expect.poll(() => preview.getAttribute('src'), { timeout: 20_000 }).not.toBe(previous);
    await expect(page.locator('#photo-status')).toContainText('Current view captured');
  }
  expect(await preview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual(dimensions);
  expect(errors).toEqual([]);
});

