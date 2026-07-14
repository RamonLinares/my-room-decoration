import { expect, type Page } from '@playwright/test';

export async function enterRoom(page: Page) {
  const begin = page.getByRole('button', { name: 'Open the door' });
  await expect(begin).toBeFocused();
  await begin.click();
  await expect(page.locator('#welcome')).toBeHidden();
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
