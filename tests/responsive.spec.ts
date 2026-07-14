import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

const viewports = [
  { name: 'phone-320', width: 320, height: 568 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'landscape-667', width: 667, height: 375 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test('navigation and editor panels fit the complete responsive matrix', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await enterRoom(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(80);
    const compact = viewport.width <= 899;
    const dock = page.locator('#dock');
    await expect(dock).toBeVisible();
    await expect(page.locator('#dock > button:visible')).toHaveCount(4);
    const metrics = await page.evaluate(() => {
      const dock = document.querySelector<HTMLElement>('#dock')!;
      const targets = [...dock.querySelectorAll<HTMLElement>(':scope > button')]
        .filter((element) => !element.hidden)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return { width: box.width, height: box.height };
        });
      const box = dock.getBoundingClientRect();
      return {
        bodyWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        dock: { top: box.top, bottom: box.bottom, height: box.height },
        targets,
      };
    });
    expect(metrics.bodyWidth, `${viewport.name} must not scroll horizontally`).toBeLessThanOrEqual(
      metrics.viewportWidth + 1,
    );
    for (const target of metrics.targets) {
      expect(target.width, `${viewport.name} target width`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${viewport.name} target height`).toBeGreaterThanOrEqual(44);
    }
    if (viewport.height <= 500 && compact)
      expect(metrics.dock.height).toBeLessThanOrEqual(viewport.height * 0.3);

    if (['phone-390', 'landscape-844', 'tablet-768', 'desktop-1440'].includes(viewport.name))
      await testInfo.attach(viewport.name, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
  }
});

test('tablet panel spacing and rotation preserve editor state', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();
  const panel = page.locator('#catalog');
  const dock = page.locator('#dock');
  const [panelBox, dockBox] = await Promise.all([panel.boundingBox(), dock.boundingBox()]);
  expect(panelBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  const dockVisible = await dock.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).opacity) > 0.1,
  );
  if (dockVisible)
    expect(dockBox!.y - (panelBox!.y + panelBox!.height)).toBeGreaterThanOrEqual(12);
  else await expect(dock).toHaveCSS('opacity', '0');

  await page.locator('#item-search').fill('Sunday chair');
  await page.getByRole('button', { name: 'Sunday chair. A quiet corner' }).click();
  await page.locator('#placement-confirm').click();
  const before = await page.evaluate(() => ({
    selected: window.__THREE_GAME_DIAGNOSTICS__!.editor.selectedId,
    cameraDistance: window.__THREE_GAME_DIAGNOSTICS__!.camera.distance,
    count: window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups,
  }));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({
    selected: window.__THREE_GAME_DIAGNOSTICS__!.editor.selectedId,
    cameraDistance: window.__THREE_GAME_DIAGNOSTICS__!.camera.distance,
    count: window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups,
  }));
  expect(after.selected).toBe(before.selected);
  expect(after.count).toBe(before.count);
  expect(after.cameraDistance).toBeCloseTo(before.cameraDistance, 4);
});

test('200 percent text, reduced motion, and forced colors remain operable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto('/');
  await enterRoom(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.locator('#more-toggle').click();
  await expect(page.locator('#secondary-actions')).toBeVisible();
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    visibleButtons: [...document.querySelectorAll<HTMLElement>('#secondary-actions button')]
      .filter((button) => button.getClientRects().length > 0)
      .every((button) => {
        const box = button.getBoundingClientRect();
        return box.width >= 44 && box.height >= 44 && box.right <= window.innerWidth + 1;
      }),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.innerWidth + 1);
  expect(result.visibleButtons).toBe(true);
  await page.getByRole('button', { name: '? Help' }).click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close help' })).toBeVisible();
});
