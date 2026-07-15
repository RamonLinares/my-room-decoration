import { expect, test } from '@playwright/test';

type IntentSnapshot = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  movementActive: boolean;
  lookActive: boolean;
  source: 'joystick' | 'dpad' | null;
};

declare global {
  interface Window {
    __touchIntentHarness?: {
      read: () => IntentSnapshot;
      consumeLookDelta: () => { x: number; y: number };
      releaseAll: () => void;
      dispose: () => void;
    };
  }
}

async function installHarness(page: import('@playwright/test').Page) {
  await page.goto('/test-harness.html');
  await page.waitForFunction(() => Boolean(window.__MY_ROOM_BROWSER_TEST_MODULES__));
  await page.evaluate(() => {
    const { TouchIntentController } = window.__MY_ROOM_BROWSER_TEST_MODULES__!;
    const root = document.createElement('div');
    root.innerHTML = `
      <div id="movement-zone"><span id="knob"></span></div>
      <div id="look-zone"></div>
      <button id="dpad-up"></button><button id="dpad-right"></button>
      <button id="dpad-down"></button><button id="dpad-left"></button>
    `;
    document.body.append(root);
    const movementZone = document.querySelector<HTMLElement>('#movement-zone')!;
    const lookZone = document.querySelector<HTMLElement>('#look-zone')!;
    Object.assign(movementZone.style, {
      position: 'fixed', left: '0', top: '0', width: '200px', height: '200px',
    });
    Object.assign(lookZone.style, {
      position: 'fixed', left: '220px', top: '0', width: '200px', height: '200px',
    });
    window.__touchIntentHarness = new TouchIntentController({
      movementZone,
      lookZone,
      knob: document.querySelector<HTMLElement>('#knob')!,
      dpad: {
        up: document.querySelector<HTMLElement>('#dpad-up')!,
        right: document.querySelector<HTMLElement>('#dpad-right')!,
        down: document.querySelector<HTMLElement>('#dpad-down')!,
        left: document.querySelector<HTMLElement>('#dpad-left')!,
      },
      floatingOrigin: false,
      radius: 80,
      deadZone: 0.1,
      lookSensitivity: 0.01,
    });
  });
}

async function dispatchPointer(
  page: import('@playwright/test').Page,
  selector: string,
  type: string,
  pointerId: number,
  x: number,
  y: number,
) {
  await page.evaluate(
    ({ selector, type, pointerId, x, y }) => {
      document.querySelector(selector)!.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 1,
          clientX: x,
          clientY: y,
        }),
      );
    },
    { selector, type, pointerId, x, y },
  );
}

test.describe('touch intent lifecycle', () => {
  test('emits normalized joystick and look intents, then consumes look delta', async ({ page }) => {
    await installHarness(page);
    await dispatchPointer(page, '#movement-zone', 'pointerdown', 1, 100, 100);
    await dispatchPointer(page, '#movement-zone', 'pointermove', 1, 180, 100);
    await dispatchPointer(page, '#look-zone', 'pointerdown', 2, 250, 50);
    await dispatchPointer(page, '#look-zone', 'pointermove', 2, 270, 65);

    const active = await page.evaluate(() => window.__touchIntentHarness!.read());
    expect(active.moveX).toBeCloseTo(1, 5);
    expect(active.moveY).toBeCloseTo(0, 5);
    expect(active.movementActive).toBe(true);
    expect(active.lookActive).toBe(true);
    expect(active.source).toBe('joystick');
    expect(await page.evaluate(() => window.__touchIntentHarness!.consumeLookDelta())).toEqual({
      x: 0.2,
      y: 0.15,
    });
    expect(await page.evaluate(() => window.__touchIntentHarness!.consumeLookDelta())).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('prevents stuck joystick input on cancel, lost capture, blur, and window release', async ({ page }) => {
    await installHarness(page);
    const assertReleased = async () => {
      const state = await page.evaluate(() => window.__touchIntentHarness!.read());
      expect(state.moveX).toBe(0);
      expect(state.moveY).toBe(0);
      expect(state.movementActive).toBe(false);
    };

    for (const endType of ['pointercancel', 'lostpointercapture']) {
      await dispatchPointer(page, '#movement-zone', 'pointerdown', 1, 100, 100);
      await dispatchPointer(page, '#movement-zone', 'pointermove', 1, 180, 100);
      await dispatchPointer(page, '#movement-zone', endType, 1, 180, 100);
      await assertReleased();
    }

    await dispatchPointer(page, '#movement-zone', 'pointerdown', 1, 100, 100);
    await dispatchPointer(page, '#movement-zone', 'pointermove', 1, 180, 100);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await assertReleased();

    await dispatchPointer(page, '#movement-zone', 'pointerdown', 1, 100, 100);
    await dispatchPointer(page, '#movement-zone', 'pointermove', 1, 180, 100);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await assertReleased();

    await dispatchPointer(page, '#movement-zone', 'pointerdown', 1, 100, 100);
    await dispatchPointer(page, '#movement-zone', 'pointermove', 1, 180, 100);
    await dispatchPointer(page, 'body', 'pointerup', 1, 180, 100);
    await assertReleased();
  });

  test('retains a labeled, keyboard-operable D-pad and clears mixed pointers', async ({ page }) => {
    await installHarness(page);
    await expect(page.locator('#dpad-up')).toHaveAttribute('aria-label', 'Move forward');
    await expect(page.locator('#dpad-right')).toHaveAttribute('aria-label', 'Move right');

    await dispatchPointer(page, '#dpad-up', 'pointerdown', 3, 0, 0);
    await dispatchPointer(page, '#dpad-right', 'pointerdown', 4, 0, 0);
    const diagonal = await page.evaluate(() => window.__touchIntentHarness!.read());
    expect(diagonal.source).toBe('dpad');
    expect(diagonal.moveX).toBeCloseTo(Math.SQRT1_2, 5);
    expect(diagonal.moveY).toBeCloseTo(-Math.SQRT1_2, 5);

    await dispatchPointer(page, 'body', 'pointercancel', 3, 0, 0);
    await dispatchPointer(page, 'body', 'pointercancel', 4, 0, 0);
    expect(await page.evaluate(() => window.__touchIntentHarness!.read())).toMatchObject({
      moveX: 0,
      moveY: 0,
      movementActive: false,
      source: null,
    });

    await page.locator('#dpad-left').focus();
    await page.keyboard.down('Enter');
    expect(await page.evaluate(() => window.__touchIntentHarness!.read())).toMatchObject({
      moveX: -1,
      moveY: 0,
      movementActive: true,
      source: 'dpad',
    });
    await page.keyboard.up('Enter');
    expect(await page.evaluate(() => window.__touchIntentHarness!.read())).toMatchObject({
      moveX: 0,
      movementActive: false,
    });
  });
});
