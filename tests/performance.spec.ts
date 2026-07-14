import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('welcome LCP stays below 2.5 seconds on a throttled mobile-class connection', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP throttling is Chromium-only');
  await page.addInitScript(() => {
    (window as Window & { __lcp?: number }).__lcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) (window as Window & { __lcp?: number }).__lcp = latest.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 93_750,
    connectionType: 'cellular4g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Open the door' })).toBeVisible();
  await page.waitForTimeout(3_000);
  const lcp = await page.evaluate(
    () => (window as Window & { __lcp?: number }).__lcp ?? 0,
  );
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThanOrEqual(2_500);
});

test('the room stays inside the production render budget', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  await page.waitForTimeout(1_200);

  const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!);
  expect(diagnostics.renderer.calls).toBeLessThanOrEqual(120);
  expect(diagnostics.renderer.triangles).toBeLessThanOrEqual(8_000);
  expect(diagnostics.renderer.geometries).toBeLessThanOrEqual(120);
  expect(diagnostics.renderer.textures).toBeLessThanOrEqual(8);
  expect(diagnostics.frameTimeMs).toBeGreaterThan(0);
  expect(diagnostics.frameTimeMs).toBeLessThanOrEqual(55);
});

test('catalog thumbnails are lazy and do not inflate the main renderer', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  const before = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.renderer);
  await page.locator('#open-catalog').click();
  await expect(page.locator('#items .item-preview').first()).toHaveAttribute('src', /data:image\/(?:webp|png)/);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.renderer);
  expect(after.calls).toBeLessThanOrEqual(before.calls + 4);
  expect(after.textures).toBeLessThanOrEqual(before.textures + 1);
});
