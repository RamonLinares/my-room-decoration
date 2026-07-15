import { expect, test } from "@playwright/test";

async function openPersistenceHarness(page: import('@playwright/test').Page) {
  await page.goto('/test-harness.html');
  await page.waitForFunction(() => Boolean(window.__MY_ROOM_BROWSER_TEST_MODULES__));
}

test.describe("versioned room persistence", () => {
  test("migrates legacy room data and preferences exactly once", async ({ page }) => {
    await openPersistenceHarness(page);
    const result = await page.evaluate(async () => {
      localStorage.clear();
      localStorage.setItem(
        "my-little-room-v1",
        JSON.stringify([{ id: "bed-1", kind: "bed", supportId: undefined }]),
      );
      localStorage.setItem(
        "my-little-room-settings-v1",
        JSON.stringify({ name: "Legacy sanctuary", width: 16, evening: true }),
      );
      localStorage.setItem("my-little-room-favorites-v1", JSON.stringify(["bed", "lamp", "bed"]));
      localStorage.setItem("my-little-room-recent-v1", JSON.stringify(["lamp", "chair"]));
      localStorage.setItem("my-little-room-placement-hint-v1", "complete");
      localStorage.setItem("my-little-room-walk-hint-v1", "dismissed");

      const { MyRoomPersistence } = window.__MY_ROOM_BROWSER_TEST_MODULES__!;
      const store = new MyRoomPersistence({ dbName: `migration-${crypto.randomUUID()}` });
      const first = await store.migrateLegacyLocalStorage();
      const second = await store.migrateLegacyLocalStorage();
      const rooms = await store.listRooms();
      const preferences = await store.getPreferences();
      const legacyStillAvailable = localStorage.getItem("my-little-room-v1") !== null;
      await store.deleteDatabase();
      return { first, second, rooms, preferences, legacyStillAvailable };
    });

    expect(result.first.migrated).toBe(true);
    expect(result.first.warnings).toEqual([]);
    expect(result.second).toMatchObject({ migrated: false, roomId: result.first.roomId });
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].name).toBe("Legacy sanctuary");
    expect(result.preferences).toEqual({
      settings: { name: "Legacy sanctuary", width: 16, evening: true },
      favorites: ["bed", "lamp"],
      recents: ["lamp", "chair"],
      placementHintComplete: true,
      walkHintDismissed: true,
    });
    expect(result.legacyStillAvailable).toBe(true);
  });

  test("creates, coalesces, lists, imports, and cascades room records", async ({ page }) => {
    await openPersistenceHarness(page);
    const result = await page.evaluate(async () => {
      const { MyRoomPersistence } = window.__MY_ROOM_BROWSER_TEST_MODULES__!;
      let clock = 1_000;
      const store = new MyRoomPersistence({
        dbName: `rooms-${crypto.randomUUID()}`,
        now: () => ++clock,
      });
      const created = await store.createRoom({
        name: "  First <Room>  ",
        design: [{ id: "chair-1", kind: "chair" }],
        thumbnail: new Blob(["thumbnail"], { type: "image/webp" }),
      });
      const saveOne = store.scheduleRoomSave({ ...created, name: "Draft one" });
      const saveTwo = store.scheduleRoomSave({ ...created, name: "Final draft" });
      await Promise.all([saveOne, saveTwo]);
      await store.flushPendingWrites();

      const imported = await store.importRoom({
        id: created.id,
        name: "Imported copy",
        design: [
          { id: "desk-old", kind: "desk" },
          { id: "monitor-old", kind: "monitor", supportId: "desk-old" },
        ],
      });
      const importedItems = imported.design as Array<{ id: string; supportId?: string }>;
      await store.createSnapshot(imported.id, imported.design, "before reshape");
      await store.saveScrapbookEntry({
        roomId: imported.id,
        image: new Blob(["image-data"], { type: "image/png" }),
        metadata: { caption: "A calm room" },
      });
      const beforeDelete = await store.listRooms();
      await store.deleteRoom(imported.id);
      const afterDelete = {
        rooms: await store.listRooms(),
        snapshots: await store.listSnapshots(imported.id),
        scrapbook: await store.listScrapbookEntries(imported.id),
      };
      await store.deleteDatabase();
      return {
        created,
        saved: beforeDelete.find((room) => room.id === created.id),
        importedId: imported.id,
        idsRemapped:
          imported.id !== created.id &&
          importedItems[0].id !== "desk-old" &&
          importedItems[1].id !== "monitor-old" &&
          importedItems[1].supportId === importedItems[0].id,
        thumbnail:
          beforeDelete.find((room) => room.id === created.id)?.thumbnail
            ? {
                type: beforeDelete.find((room) => room.id === created.id)!.thumbnail!.type,
                text: await beforeDelete.find((room) => room.id === created.id)!.thumbnail!.text(),
              }
            : undefined,
        beforeDeleteCount: beforeDelete.length,
        afterDelete,
      };
    });

    expect(result.created.name).toBe("First Room");
    expect(result.saved?.name).toBe("Final draft");
    expect(result.idsRemapped).toBe(true);
    expect(result.thumbnail).toEqual({ type: "image/webp", text: "thumbnail" });
    expect(result.beforeDeleteCount).toBe(2);
    expect(result.afterDelete.rooms).toHaveLength(1);
    expect(result.afterDelete.snapshots).toEqual([]);
    expect(result.afterDelete.scrapbook).toEqual([]);
  });

  test("prunes snapshots and round-trips scrapbook blobs", async ({ page }) => {
    await openPersistenceHarness(page);
    const result = await page.evaluate(async () => {
      const { MyRoomPersistence } = window.__MY_ROOM_BROWSER_TEST_MODULES__!;
      let clock = 10_000;
      const issues: Array<{ code: string; operation: string }> = [];
      const store = new MyRoomPersistence({
        dbName: `snapshots-${crypto.randomUUID()}`,
        snapshotLimitPerRoom: 3,
        now: () => ++clock,
        onIssue: (issue) => issues.push({ code: issue.code, operation: issue.operation }),
      });
      const room = await store.createRoom({ name: "Snapshot room", design: [] });
      for (let index = 0; index < 5; index += 1) {
        await store.createSnapshot(room.id, [{ version: index }], `version ${index}`);
      }
      const snapshots = await store.listSnapshots(room.id);
      const entry = await store.saveScrapbookEntry({
        roomId: room.id,
        image: new Blob(["room-photo"], { type: "image/png" }),
        metadata: { storyId: "first-room", tags: ["cozy"] },
      });
      const scrapbook = await store.listScrapbookEntries(room.id);
      let invalidCode = "";
      try {
        await store.saveScrapbookEntry({ roomId: room.id, image: new Blob([]) });
      } catch (error) {
        invalidCode = (error as { code?: string }).code ?? "";
      }
      const photoText = await scrapbook[0].image.text();
      const estimate = await store.estimateStorage();
      await store.deleteDatabase();
      return {
        reasons: snapshots.map((snapshot) => snapshot.reason),
        entryId: entry.id,
        scrapbookCount: scrapbook.length,
        photoText,
        metadata: scrapbook[0].metadata,
        invalidCode,
        issues,
        estimateHasValidValues:
          estimate.usage === undefined ||
          (estimate.usage >= 0 && (estimate.quota === undefined || estimate.quota >= estimate.usage)),
      };
    });

    expect(result.reasons).toEqual(["version 4", "version 3", "version 2"]);
    expect(result.entryId).toBeTruthy();
    expect(result.scrapbookCount).toBe(1);
    expect(result.photoText).toBe("room-photo");
    expect(result.metadata).toEqual({ storyId: "first-room", tags: ["cozy"] });
    expect(result.invalidCode).toBe("corrupt-data");
    expect(result.issues).toContainEqual({ code: "corrupt-data", operation: "save-scrapbook" });
    expect(result.estimateHasValidValues).toBe(true);
  });
});
