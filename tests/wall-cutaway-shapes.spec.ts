import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('rectangle, L, T, and U rooms keep far walls opaque and cut near walls cleanly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Orbit visual regression runs in the desktop render project.');
  await page.goto('/');
  await enterRoom(page);
  const canvas = page.locator('#game-canvas');
  for (const shape of ['rectangle', 'l', 't', 'u']) {
    await page.locator('#open-room').click();
    await page.locator(`[data-shape="${shape}"]`).click();
    await page.locator('#close-room').click();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width * .6, box.y + box.height * .45);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .38, box.y + box.height * .45, { steps: 5 });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const opacity = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.camera.wallOpacity);
    const values = Object.values(opacity);
    expect(values.every((value) => value === 0 || value === 1)).toBe(true);
    expect(values.filter((value) => value === 1).length).toBeGreaterThanOrEqual(2);
    expect(values.filter((value) => value === 0).length).toBeGreaterThanOrEqual(1);
  }
});

