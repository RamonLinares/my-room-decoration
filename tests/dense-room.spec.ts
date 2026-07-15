import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('a 100-object dense-room fixture stays interactive and inside scaling budgets', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      id: `dense-${index}`,
      kind: 'memoryrug',
      name: 'Memory rug',
      category: 'decor',
      x: -5.4 + (index % 10) * 1.2,
      y: 0,
      z: -4.4 + Math.floor(index / 10) * .96,
      rot: (index % 4) * Math.PI / 2,
      color: 0xffffff,
      scale: .34,
    }));
    localStorage.setItem('my-little-room-v1', JSON.stringify(items));
    localStorage.setItem('my-little-room-editable-fixtures-v1', '1');
  });
  await page.goto('/');
  await enterRoom(page);
  await expect.poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.entities.pickups)).toBe(100);
  await page.waitForTimeout(7_000);
  const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
  expect(diagnostics.renderer.calls).toBeLessThanOrEqual(180);
  expect(diagnostics.renderer.geometries).toBeLessThanOrEqual(200);
  expect(diagnostics.performance.collisionCells).toBeGreaterThan(0);
  expect(diagnostics.performance.p95FrameMs).toBeLessThanOrEqual(
    testInfo.project.name.includes('mobile') ? 33.3 : 20,
  );
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text!()).objectCount)).toBe(100);
});

for (const count of [200, 500]) {
  test(`${count}-object soak fixture loads, publishes bounded diagnostics, and remains scriptable`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'The 100-object mobile gate covers the supported mid-tier target.');
    test.setTimeout(60_000);
    await page.addInitScript((objectCount) => {
      const items = Array.from({ length: objectCount }, (_, index) => ({
        id: `soak-${index}`,
        kind: 'memoryrug',
        name: 'Memory rug',
        category: 'decor',
        x: -5.5 + (index % 20) * .58,
        y: 0,
        z: -4.6 + (Math.floor(index / 20) % 18) * .54,
        rot: (index % 8) * Math.PI / 4,
        color: 0xffffff,
        scale: .16,
      }));
      localStorage.setItem('my-little-room-v1', JSON.stringify(items));
      localStorage.setItem('my-little-room-editable-fixtures-v1', '1');
    }, count);
    await page.goto('/');
    await enterRoom(page);
    await expect.poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.entities.pickups), { timeout: 30_000 }).toBe(count);
    await page.waitForTimeout(4_000);
    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
    expect(diagnostics.renderer.calls).toBeLessThanOrEqual(count + 100);
    expect(diagnostics.renderer.geometries).toBeLessThanOrEqual(count + 100);
    expect(diagnostics.performance.p95FrameMs).toBeLessThanOrEqual(33.3);
    expect(await page.evaluate(() => JSON.parse(window.render_game_to_text!()).objectCount)).toBe(count);
  });
}
