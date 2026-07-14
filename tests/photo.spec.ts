import { expect, test } from '@playwright/test';

test('captures the current room view with a camera shutter effect', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await page.locator('#welcome').evaluate((element) => element.classList.add('gone'));
  const canvasRatio = await page.locator('#game-canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width / rect.height;
  });

  await page.locator('#open-photo').evaluate((element: HTMLButtonElement) => element.click());
  await expect(page.locator('#camera-shutter')).toHaveClass(/firing/);
  await expect(page.locator('#photo-studio')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#photo-status')).toContainText('Current view captured');

  const preview = page.locator('#photo-preview');
  const imageSize = await preview.evaluate((image: HTMLImageElement) => ({
    width: image.naturalWidth,
    height: image.naturalHeight,
  }));
  expect(imageSize.width).toBeGreaterThanOrEqual(900);
  expect(Math.abs(imageSize.width / imageSize.height - canvasRatio)).toBeLessThan(0.015);

  await expect(page.locator('[data-photo-perspective]')).toHaveCount(0);
  await expect(page.locator('[data-photo-dof]')).toHaveCount(0);
  await expect(page.locator('[data-photo-realism]')).toHaveCount(0);
  await expect(page.locator('#photo-focus')).toHaveCount(0);

  const viewport = page.viewportSize();
  const sheetBox = await page.locator('.photo-sheet').boundingBox();
  expect(sheetBox).not.toBeNull();
  if (viewport && sheetBox) {
    expect(sheetBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(sheetBox.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await testInfo.attach(`${testInfo.project.name}-simple-photo`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
