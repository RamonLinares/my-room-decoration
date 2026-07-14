import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('catalog preview is non-destructive and supports commit, cancel, and undo', async ({
  page,
}) => {
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();

  const before = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups,
  );
  await page.locator('#item-search').fill('Sunday chair');
  await page.getByRole('button', { name: 'Sunday chair. A quiet corner' }).click();

  await expect(page.locator('#placement-toolbar')).toBeVisible();
  await expect(page.locator('#placement-confirm')).toBeEnabled();
  expect(
    await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups),
  ).toBe(before);
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.placement?.kind))
    .toBe('chair');

  const desk = await page.evaluate(() =>
    window.__THREE_GAME_DIAGNOSTICS__!.editor.objects.find(
      (object) => object.kind === 'desk',
    ),
  );
  expect(desk).toBeDefined();
  await page.locator('#game-canvas').dispatchEvent('pointermove', {
    bubbles: true,
    clientX: desk!.screen.x,
    clientY: desk!.screen.y,
    pointerType: 'mouse',
  });
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.placement?.valid))
    .toBe(false);
  await expect(page.locator('#placement-confirm')).toBeDisabled();

  await page.locator('#placement-cancel').click();
  await expect(page.locator('#placement-toolbar')).toBeHidden();
  expect(
    await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups),
  ).toBe(before);

  await page.getByRole('button', { name: 'Sunday chair. A quiet corner' }).click();
  await page.locator('#placement-confirm').click();
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups))
    .toBe(before + 1);
  await page.locator('#undo').click();
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.entities.pickups))
    .toBe(before);
});

test('catalog supports placement, size, and alphabetical discovery filters', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  await page.locator('#open-catalog').click();

  await page.locator('.catalog-filter-drawer > summary').click();
  await page.locator('#catalog-placement').selectOption('wall');
  await page.locator('#catalog-size').selectOption('small');
  await page.locator('.catalog-filter-drawer > summary').click();
  await expect(page.locator('#items .item[aria-label^="White wall radiator."]')).toBeVisible();
  await expect(page.locator('#items .item[aria-label^="Patchwork bed."]')).toHaveCount(0);

  await page.locator('.catalog-filter-drawer > summary').click();
  await page.locator('#catalog-placement').selectOption('all');
  await page.locator('#catalog-size').selectOption('all');
  await page.locator('#catalog-sort').selectOption('name');
  await page.locator('.catalog-filter-drawer > summary').click();
  const names = await page.locator('#items .item').evaluateAll((buttons) =>
    buttons.slice(0, 8).map((button) => button.getAttribute('aria-label') ?? ''),
  );
  expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
});
