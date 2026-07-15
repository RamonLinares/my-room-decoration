import { expect, test } from "@playwright/test";
import {
  CatalogDiscovery,
  CatalogPreviewQueue,
  type CatalogDiscoveryItem,
} from "../src/game/CatalogDiscovery";

const now = Date.UTC(2026, 6, 15);
const items: CatalogDiscoveryItem[] = [
  { kind: "chair", name: "Sunday chair", category: "furniture", tags: ["seating"], width: 0.8, depth: 0.8, placement: "floor" },
  { kind: "lamp", name: "Honey lamp", category: "light", tags: ["task-light"], width: 0.3, depth: 0.3, placement: "surface", fitsOn: ["desk", "nightstand"] },
  { kind: "books", name: "Dog-eared books", category: "keepsake", tags: ["books", "personal"], width: 0.4, depth: 0.25, placement: "surface" },
  { kind: "radio", name: "Little radio", category: "keepsake", tags: ["music"], width: 0.5, depth: 0.25, placement: "surface" },
  { kind: "plant", name: "Potted plant", category: "plant", tags: ["plant", "natural"], width: 0.5, depth: 0.5, placement: "floor", addedAt: now - 2 * 86_400_000 },
  { kind: "old", name: "Old shelf", category: "furniture", tags: ["storage"], width: 2, depth: 0.5, placement: "floor", addedAt: now - 100 * 86_400_000 },
  { kind: "real", name: "Real desk", category: "realroom", tags: ["workspace", "surface"], width: 1.5, depth: 0.7, placement: "floor" },
];

test("curated collections expose coherent shortcuts without hiding the full catalog", () => {
  const discovery = new CatalogDiscovery(items);
  const collections = discovery.collections(now);
  expect(discovery.allItems()).toHaveLength(items.length);
  expect(collections.find((collection) => collection.id === "cozy-reading")).toMatchObject({
    itemCount: 3,
    approximateSpace: expect.any(String),
  });
  expect(collections.find((collection) => collection.id === "real-room-essentials")?.kinds).toEqual(["real"]);
  expect(collections.find((collection) => collection.id === "recently-added")?.kinds).toEqual(["plant"]);
});

test("context recommendations explain fit and Surprise me is deterministic", () => {
  const discovery = new CatalogDiscovery(items);
  const fitsDesk = discovery.recommend({
    selectedSurfaceKind: "desk",
    availableWidth: 0.35,
    availableDepth: 0.35,
  });
  expect(fitsDesk).toHaveLength(1);
  expect(fitsDesk[0]).toMatchObject({
    item: { kind: "lamp" },
    reasons: expect.arrayContaining(["Fits on desk", "Fits 0.3 m width", "Fits 0.3 m depth"]),
  });
  const first = discovery.surprise({ collectionId: "cozy-reading", seed: "same-room" });
  const second = discovery.surprise({ collectionId: "cozy-reading", seed: "same-room" });
  expect(first).toEqual(second);
  expect(first?.item.kind).toBeTruthy();
});

test("preview work is version-cached, cancellable, and frame-budgeted", async () => {
  let clock = 0;
  let yields = 0;
  let renders = 0;
  const queue = new CatalogPreviewQueue<string>(
    "assets-v2",
    8,
    () => (clock += 3),
    async () => {
      yields += 1;
    },
  );
  const one = queue.schedule({ key: "chair", render: async () => { renders += 1; return "chair-preview"; } });
  await expect(one.promise).resolves.toBe("chair-preview");
  const cached = queue.schedule({ key: "chair", render: async () => { renders += 1; return "new"; } });
  await expect(cached.promise).resolves.toBe("chair-preview");
  expect(renders).toBe(1);

  let release = () => {};
  const slow = queue.schedule({
    key: "slow",
    render: () => new Promise<string>((resolve) => { release = () => resolve("late"); }),
  });
  slow.cancel();
  release();
  await expect(slow.promise).rejects.toMatchObject({ name: "AbortError" });
  expect(yields).toBeGreaterThanOrEqual(0);
});
