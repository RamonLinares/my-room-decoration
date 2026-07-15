import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';
import { roomBoundaryWalls } from '../src/systems/RoomPlacementSolver';

test('wall solver excludes shared interior edges in shaped rooms', () => {
  const walls = roomBoundaryWalls([
    { minX: -5, maxX: 5, minZ: -4, maxZ: 0 },
    { minX: -5, maxX: -1, minZ: 0, maxZ: 4 },
  ]);
  const sharedEdgeIsWall = walls.some((wall) => {
    if (Math.abs(wall.cz) > 0.001 || wall.inwardZ === 0) return false;
    const start = wall.cx - wall.length / 2;
    const end = wall.cx + wall.length / 2;
    return start < -3 && end > -3;
  });

  expect(sharedEdgeIsWall).toBe(false);
  expect(walls.some((wall) => wall.side === 'front' && wall.cz === 4)).toBe(true);
  expect(walls.some((wall) => wall.side === 'right' && wall.cx === 5)).toBe(true);
});

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

test('height is available while placing and after selecting an object', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();

  await page.locator('#item-search').fill('Memory shelf');
  await page.getByRole('button', { name: 'Memory shelf. Treasures live here' }).click();

  await expect(page.locator('.placement-height-control')).toBeVisible();
  await expect(page.locator('#placement-height-value')).toHaveText('0.0');
  await page.locator('#placement-raise').click();
  await expect(page.locator('#placement-height-value')).toHaveText('0.2');
  await page.keyboard.press('r');
  await expect(page.locator('#placement-height-value')).toHaveText('0.4');
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.placement?.y))
    .toBeCloseTo(0.4);

  await page.locator('#placement-confirm').click();
  await expect(page.locator('.selection-height')).toBeVisible();
  await expect(page.locator('.selection-more')).not.toHaveAttribute('open', '');
  await expect(page.locator('.selection-more #raise')).toHaveCount(0);
  await page.locator('#raise').click();
  await expect
    .poll(() => page.evaluate(() => {
      const state = JSON.parse(window.render_game_to_text!());
      return state.visibleObjects.find(
        (object: { id: string }) => object.id === state.selectedObjectId,
      )?.position.y;
    }))
    .toBeCloseTo(0.6);
});

test('repeated cabinet rotations preserve the object center', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();

  await page.locator('#item-search').fill('Double glass cabinet');
  await page.locator('.item[aria-label^="Double glass cabinet."]').click();
  await expect(page.locator('#placement-confirm')).toBeEnabled();
  await page.locator('#placement-confirm').click();

  const selectedPosition = () => page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text!());
    return state.visibleObjects.find(
      (object: { id: string }) => object.id === state.selectedObjectId,
    )?.position as { x: number; y: number; z: number };
  });
  const selectedScreen = await page.evaluate(() => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__!;
    return diagnostics.editor.objects.find(
      (object) => object.id === diagnostics.editor.selectedId,
    )!.screen;
  });
  await page.mouse.move(selectedScreen.x, selectedScreen.y - 100);
  await page.mouse.down();
  await page.mouse.move(1040, 520, { steps: 8 });
  await page.mouse.up();
  const before = await selectedPosition();
  expect(Math.abs(before.x) + Math.abs(before.z)).toBeGreaterThan(3);
  await page.locator('#rotate-right').evaluate((button: HTMLButtonElement) => {
    for (let turn = 0; turn < 24; turn += 1) button.click();
  });
  const after = await selectedPosition();

  expect(after.x).toBeCloseTo(before.x, 6);
  expect(after.z).toBeCloseTo(before.z, 6);
});

test('wall-mounted objects start on a boundary wall and choose a clear slot', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();

  const addWallShelf = async () => {
    await page.locator('#item-search').fill('Wall book shelf');
    await page.getByRole('button', { name: 'Wall book shelf. Books above the floor' }).click();
    await expect(page.locator('#placement-confirm')).toBeEnabled();
    const preview = await page.evaluate(() =>
      window.__THREE_GAME_DIAGNOSTICS__!.editor.placement,
    );
    expect(preview?.surface).toBe('wall');
    expect(preview?.wallSide).toMatch(/back|front|left|right/);
    await expect(page.locator('#placement-status')).toContainText('wall');
    await page.locator('#placement-confirm').click();
    return page.evaluate(() => {
      const state = JSON.parse(window.render_game_to_text!());
      return state.visibleObjects.find(
        (object: { id: string }) => object.id === state.selectedObjectId,
      ) as { position: { x: number; y: number; z: number }; wallSide: string };
    });
  };

  const first = await addWallShelf();
  expect(first.wallSide).toMatch(/back|front|left|right/);
  expect(first.position.y).toBeCloseTo(4.3, 1);

  await page.locator('#open-catalog').click();
  const second = await addWallShelf();
  expect(second.wallSide).toMatch(/back|front|left|right/);
  expect(
    Math.hypot(
      second.position.x - first.position.x,
      second.position.z - first.position.z,
    ),
  ).toBeGreaterThan(0.5);
});

test('surface objects stay attached to a usable support top', async ({ page }) => {
  await page.goto('/');
  await enterRoom(page);
  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();

  await page.locator('#item-search').fill('Storybook memory box');
  await page.getByRole('button', { name: 'Storybook memory box. A handmade chest of little wonders' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.placement?.supportId),
    )
    .not.toBeNull();
  await expect(page.locator('#placement-status')).toContainText('On ');

  const canvas = await page.locator('#game-canvas').boundingBox();
  expect(canvas).not.toBeNull();
  await page.locator('#game-canvas').dispatchEvent('pointermove', {
    bubbles: true,
    clientX: canvas!.x + canvas!.width * 0.52,
    clientY: canvas!.y + canvas!.height * 0.7,
    pointerType: 'mouse',
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.placement?.supportId),
    )
    .toBeNull();
  await expect(page.locator('#placement-confirm')).toBeDisabled();
});
