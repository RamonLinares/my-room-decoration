import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

type CanvasSample = {
  ok: boolean;
  reason: string;
  variance?: number;
  colorBuckets?: number;
};

async function sampleCanvas(page: import('@playwright/test').Page): Promise<CanvasSample> {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box || box.width < 32 || box.height < 32) {
    return { ok: false, reason: 'canvas-too-small' };
  }

  const buffer = await canvas.screenshot();
  const png = PNG.sync.read(buffer);
  let min = 255;
  let max = 0;
  let alphaPixels = 0;
  const buckets = new Set<string>();
  const stride = Math.max(1, Math.floor((png.width * png.height) / 4096));

  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const offset = pixel * 4;
    const r = png.data[offset];
    const g = png.data[offset + 1];
    const b = png.data[offset + 2];
    const a = png.data[offset + 3];
    min = Math.min(min, r, g, b);
    max = Math.max(max, r, g, b);
    if (a > 0) alphaPixels += 1;
    buckets.add(`${r >> 4},${g >> 4},${b >> 4},${a >> 6}`);
  }

  const variance = max - min;
  return {
    ok: alphaPixels > 256 && (variance > 8 || buckets.size > 3),
    reason: 'sampled',
    variance,
    colorBuckets: buckets.size,
  };
}

test('renders a nonblank interactive game canvas', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 10);

  const sample = await sampleCanvas(page);
  expect(sample, JSON.stringify(sample)).toMatchObject({ ok: true });

  const before = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.player.position.z ?? 0);

  if (testInfo.project.name.includes('mobile')) {
    const stick = page.locator('#touch-stick');
    await expect(stick).toBeVisible();
    const box = await stick.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.05, { steps: 6 });
      await page.waitForTimeout(450);
      await page.mouse.up();
    }
  } else {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyW');
  }

  await expect
    .poll(async () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.player.position.z ?? 0))
    .toBeLessThan(before - 0.3);

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(`${testInfo.project.name}-game`, {
    body: screenshot,
    contentType: 'image/png',
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('fades only the room walls nearest the orbit camera', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Orbit regression uses desktop pointer controls');

  await page.goto('/');
  await page.locator('#welcome').evaluate((element) => element.classList.add('gone'));
  await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 10);

  const initial = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__?.camera.wallOpacity,
  );
  expect(initial?.back).toBeGreaterThan(0.95);
  expect(initial?.left).toBeGreaterThan(0.95);
  expect(initial?.front).toBeLessThan(0.2);
  expect(initial?.right).toBeLessThan(0.2);
  expect(Object.keys(initial ?? {})).toHaveLength(4);

  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  for (let turn = 0; turn < 2; turn += 1) {
    const x = box.x + box.width * 0.52;
    const y = box.y + box.height * 0.18;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(350);
  }

  const rotated = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__?.camera.wallOpacity,
  );
  const opacities = Object.values(rotated ?? {});
  expect(Math.min(...opacities)).toBeLessThan(0.2);
  expect(Math.max(...opacities)).toBeGreaterThan(0.8);
});
