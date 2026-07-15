import { expect, test } from '@playwright/test';

test('default snapshots retain at least 20 or seven days while enforcing a hard bound', async ({ page }) => {
  await page.goto('/test-harness.html');
  await page.waitForFunction(() => Boolean(window.__MY_ROOM_BROWSER_TEST_MODULES__));
  const result = await page.evaluate(async () => {
    const { MyRoomPersistence } = window.__MY_ROOM_BROWSER_TEST_MODULES__!;
    const day = 24 * 60 * 60 * 1_000;
    let clock = 1_000;
    const store = new MyRoomPersistence({
      dbName: `retention-${crypto.randomUUID()}`,
      now: () => ++clock,
    });
    const room = await store.createRoom({ name: 'Retention room', design: [] });
    for (let index = 0; index < 25; index += 1) {
      await store.createSnapshot(room.id, { index }, `recent ${index}`);
    }
    const withinSevenDays = await store.listSnapshots(room.id);
    clock += 8 * day;
    await store.createSnapshot(room.id, { index: 25 }, 'after eight days');
    const afterSevenDays = await store.listSnapshots(room.id);
    await store.deleteDatabase();

    let hardClock = 5_000;
    const hardStore = new MyRoomPersistence({
      dbName: `hard-retention-${crypto.randomUUID()}`,
      now: () => ++hardClock,
      snapshotHardLimitPerRoom: 22,
    });
    const hardRoom = await hardStore.createRoom({ name: 'Hard bound room', design: [] });
    for (let index = 0; index < 25; index += 1) {
      await hardStore.createSnapshot(hardRoom.id, { index }, `rapid ${index}`);
    }
    const hardBound = await hardStore.listSnapshots(hardRoom.id);
    await hardStore.deleteDatabase();
    return {
      withinSevenDays: withinSevenDays.length,
      afterSevenDays: afterSevenDays.length,
      newestReason: afterSevenDays[0].reason,
      hardBound: hardBound.length,
    };
  });

  expect(result).toEqual({
    withinSevenDays: 25,
    afterSevenDays: 20,
    newestReason: 'after eight days',
    hardBound: 22,
  });
});
