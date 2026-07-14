import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('pinch always zooms without resizing furniture or adding undo history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();
  await page.locator('#item-search').fill('Sunday chair');
  await page.getByRole('button', { name: 'Sunday chair. A quiet corner' }).click();
  await page.locator('#placement-confirm').click();

  const before = await page.evaluate(() => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__!;
    const chair = [...diagnostics.editor.objects]
      .reverse()
      .find((object) => object.kind === 'chair')!;
    return {
      distance: diagnostics.camera.distance,
      scale: chair.scale,
      history: diagnostics.editor.historyLength,
      chairId: chair.id,
    };
  });
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const send = (type: string, pointerId: number, x: number, y: number) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 11,
        }),
      );
    send('pointerdown', 11, 120, 170);
    send('pointerdown', 12, 220, 170);
    send('pointermove', 11, 80, 170);
    send('pointermove', 12, 260, 170);
    send('pointerup', 11, 80, 170);
    send('pointerup', 12, 260, 170);
  });
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.camera.distance))
    .not.toBe(before.distance);
  const after = await page.evaluate((chairId) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__!;
    return {
      scale: diagnostics.editor.objects.find((object) => object.id === chairId)!.scale,
      history: diagnostics.editor.historyLength,
    };
  }, before.chairId);
  expect(after.scale).toBe(before.scale);
  expect(after.history).toBe(before.history);
});
