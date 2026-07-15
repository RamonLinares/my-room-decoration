import { expect, test } from '@playwright/test';
import { clickRoomTool, enterRoom } from './helpers';

test('walk mode moves, looks, zooms, and captures the live view', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await enterRoom(page);
  await page.locator('#walk-toggle').click();
  await expect(page.locator('body')).toHaveClass(/first-person/);
  await expect(page.locator('#walk-hud')).toHaveAttribute('aria-hidden', 'false');
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.state))
    .toBe('walking');

  const start = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.player.position,
  );
  const initialFov = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.camera.fov,
  );
  const initialHeight = start.y;
  expect(initialHeight).toBeGreaterThanOrEqual(1.6);
  expect(initialHeight).toBeLessThanOrEqual(1.75);

  if (testInfo.project.name.includes('mobile')) {
    const forward = page.locator('[data-walk="forward"]');
    await expect(forward).toBeVisible();
    await forward.dispatchEvent('pointerdown', {
      pointerId: 21,
      pointerType: 'touch',
      isPrimary: true,
    });
    await page.waitForTimeout(650);
    await forward.dispatchEvent('pointerup', {
      pointerId: 21,
      pointerType: 'touch',
      isPrimary: true,
    });
    await page.locator('#walk-zoom-in').click();
    await page.locator('#walk-height-up').click();
  } else {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(650);
    await page.keyboard.up('KeyW');
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.38, {
        steps: 5,
      });
      await page.mouse.up();
      await page.mouse.wheel(0, -100);
    }
    await page.keyboard.press('KeyR');
  }

  await expect
    .poll(async () => {
      const current = await page.evaluate(
        () => window.__THREE_GAME_DIAGNOSTICS__!.player.position,
      );
      return Math.hypot(current.x - start.x, current.z - start.z);
    })
    .toBeGreaterThan(0.35);
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.camera.fov),
    )
    .toBeLessThan(initialFov);
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.player.position.y),
    )
    .toBeGreaterThan(initialHeight + 0.1);
  await expect(page.locator('#walk-height-value')).toContainText('m');

  await page.locator('#walk-height-up').evaluate((button: HTMLButtonElement) => {
    for (let i = 0; i < 30; i += 1) button.click();
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.player.position.y),
    )
    .toBe(2.1);
  await expect(page.locator('#walk-height-value')).toHaveText('2.10 m');

  if (!testInfo.project.name.includes('mobile')) {
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.abs(window.__THREE_GAME_DIAGNOSTICS__!.camera.yaw),
        ),
      )
      .toBeGreaterThan(0.1);
  }

  // The dedicated photo regression checks the short-lived shutter animation;
  // this walk-mode test verifies the durable result of capturing the live view.
  await clickRoomTool(page, '#open-photo');
  await expect(page.locator('#photo-studio')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#photo-status')).toContainText('Current view captured');
  await page.locator('#close-photo').click();
  await page.locator('#walk-toggle').click();
  await expect(page.locator('body')).not.toHaveClass(/first-person/);

  await testInfo.attach(`${testInfo.project.name}-walk-mode`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
