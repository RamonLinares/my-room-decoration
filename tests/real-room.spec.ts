import { expect, test } from '@playwright/test';

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
  await page.locator('#welcome').evaluate((element) => element.classList.add('gone'));
  await page.locator('[data-cat="realroom"]').click();

  const items = page.locator('#items .item');
  await expect(items).toHaveCount(24);
  await items.evaluateAll((buttons) => {
    for (const button of buttons) {
      (button as HTMLButtonElement).click();
      (document.querySelector('#remove') as HTMLButtonElement).click();
    }
    (buttons[2] as HTMLButtonElement).click();
  });

  await page.locator('#close-catalog').evaluate((button: HTMLButtonElement) => button.click());
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
