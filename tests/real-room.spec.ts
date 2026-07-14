import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('the My room collection exposes and renders every photo-derived prop', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await enterRoom(page);
  await page.locator('#sound').click();
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();
  await page.locator('[data-cat="realroom"]').click();

  const items = page.locator('#items .item');
  await expect(items).toHaveCount(28);
  await items.evaluateAll((buttons) => {
    for (const button of buttons) {
      (button as HTMLButtonElement).click();
      (document.querySelector('#placement-cancel') as HTMLButtonElement).click();
    }
    (buttons[2] as HTMLButtonElement).click();
    (document.querySelector('#placement-confirm') as HTMLButtonElement).click();
  });
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.entities.pickups))
    .toBeGreaterThanOrEqual(1);
  await testInfo.attach(`${testInfo.project.name}-real-room-collection`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
