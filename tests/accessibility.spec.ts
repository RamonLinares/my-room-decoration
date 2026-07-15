import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

test('welcome is modal, traps focus, and releases the editor cleanly', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const welcome = page.locator('#welcome');
  const begin = page.getByRole('button', { name: 'Open the door' });

  await expect(welcome).toHaveAttribute('role', 'dialog');
  await expect(welcome).toHaveAttribute('aria-modal', 'true');
  await expect(begin).toBeFocused();
  if (!testInfo.project.name.includes('mobile')) {
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => document.querySelector('#welcome')?.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => page.evaluate(() => document.querySelector('#welcome')?.contains(document.activeElement))).toBe(true);
  }

  const nonModalSiblingsAreInert = await page.locator('#app').evaluate(
    (root, activeId) =>
      [...root.children]
        .filter((child) => child.id !== activeId)
        .every((child) => child.hasAttribute('inert')),
    'welcome',
  );
  expect(nonModalSiblingsAreInert).toBe(true);

  const welcomeAxe = await new AxeBuilder({ page }).include('#welcome').analyze();
  expect(welcomeAxe.violations).toEqual([]);

  await begin.focus();
  await enterRoom(page);
  await expect(welcome).toHaveAttribute('aria-hidden', 'true');
  await expect(welcome).toHaveAttribute('inert', '');
});

test('closed surfaces are inert and panel focus returns to its opener', async ({
  page,
}) => {
  await page.goto('/');
  await enterRoom(page);

  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();
  await page.locator('#close-catalog').click();
  await expect(page.locator('#catalog')).toBeHidden();
  await expect(page.locator('#open-catalog')).toBeFocused();

  const closedState = await page.evaluate((selector) => {
    const ids = [
      'catalog',
      'room-panel',
      'file-panel',
      'selection',
      'walk-hud',
      'photo-studio',
      'welcome',
    ];
    return ids.map((id) => {
      const surface = document.getElementById(id)!;
      const descendants = [...surface.querySelectorAll<HTMLElement>(selector)];
      return {
        id,
        hidden: surface.hidden,
        inert: surface.hasAttribute('inert'),
        focusableDescendants: descendants.filter(
          (element) => !element.hasAttribute('disabled'),
        ).length,
      };
    });
  }, focusableSelector);
  for (const state of closedState) {
    expect(state.hidden || state.inert, `${state.id} must be inactive`).toBe(true);
  }

  await page.locator('#open-room').click();
  await expect(page.locator('#open-room')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#close-room')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#room-panel')).toBeHidden();
  await expect(page.locator('#open-room')).toBeFocused();
  await expect(page.locator('#open-room')).toHaveAttribute('aria-expanded', 'false');
});

test('keyboard object manager supports selection, movement, transforms, removal, and undo', async ({
  page,
}) => {
  await page.goto('/');
  await enterRoom(page);

  if (await page.locator('#catalog').evaluate((element) => element.hasAttribute('inert')))
    await page.locator('#open-catalog').click();
  await page.getByRole('tab', { name: 'In this room' }).click();

  // Placement and collision behavior has its own regression suite. Use a
  // deterministic furnished-room object here so this test isolates keyboard
  // management at every responsive width, including very narrow mobile rooms.
  const objectButtons = page.locator('.room-object').filter({
    hasText: 'Old teddy',
  });
  const objectCount = await objectButtons.count();
  expect(objectCount).toBeGreaterThan(0);
  const objectButton = objectButtons.nth(objectCount - 1);
  await objectButton.click();
  await expect(objectButton).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.editor.selectedId))
    .not.toBeNull();

  const beforeX = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__!.player.position.x,
  );
  await objectButton.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__!.player.position.x),
    )
    .toBeGreaterThan(beforeX);
  await expect(page.locator('#editor-status')).toContainText('moved to');

  await page.locator('[data-object-action="rotate-right"]').click();
  await page.locator('[data-object-action="larger"]').click();
  await page.locator('[data-object-action="color"]').click();

  const beforeRemove = await page.locator('.room-object').count();
  await page.locator('[data-object-action="remove"]').click();
  await expect(page.locator('.room-object')).toHaveCount(beforeRemove - 1);
  await expect(page.locator('#editor-status')).toContainText('removed');

  await page.locator('#object-manager-undo').click();
  await expect(page.locator('.room-object')).toHaveCount(beforeRemove);
});

test('the active editor has no serious automated accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await enterRoom(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  );
  expect(serious).toEqual([]);
});
