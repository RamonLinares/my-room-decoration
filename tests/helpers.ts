import { expect, type Page } from '@playwright/test';

export async function enterRoom(page: Page) {
  const begin = page.getByRole('button', { name: 'Open the door' });
  await expect(begin).toBeFocused();
  await begin.click();
  // The postcard deliberately fades with opacity before it is removed from layout.
  // Playwright's visibility model ignores opacity, so assert the immediate,
  // user-relevant closed state rather than racing the decorative hide timer.
  await expect(page.locator('#welcome')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#welcome')).toHaveClass(/gone/);
  await expect(page.locator('#open-catalog')).toBeFocused();
}

export async function clickRoomTool(page: Page, selector: string) {
  const target = page.locator(selector);
  if (await target.isVisible()) {
    await target.click();
    return;
  }
  if (selector === '#open-photo' && (await page.locator('#walk-photo').isVisible())) {
    await page.locator('#walk-photo').click();
    return;
  }
  await page.locator('#more-toggle').click();
  await expect(page.locator('#secondary-actions')).toBeVisible();
  await target.click();
}
