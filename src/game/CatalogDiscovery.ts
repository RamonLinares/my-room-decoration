export const CATALOG_DISCOVERY_VERSION = 1;

export type CatalogDiscoveryItem = {
  kind: string;
  name: string;
  category: string;
  tags: string[];
  width: number;
  depth: number;
  placement: "floor" | "surface" | "wall" | "ceiling";
  addedAt?: number;
  fitsOn?: string[];
};

export type CatalogCollectionId =
  | "cozy-reading"
  | "music-room"
  | "study-setup"
  | "plant-filled"
  | "sleepover"
  | "real-room-essentials"
  | "recently-added";

export type CatalogCollection = {
  id: CatalogCollectionId;
  title: string;
  description: string;
  itemCount: number;
  approximateSpace: "tiny" | "small" | "medium" | "large";
  kinds: string[];
};

export type CatalogContext = {
  selectedSurfaceKind?: string;
  availableWidth?: number;
  availableDepth?: number;
  placement?: CatalogDiscoveryItem["placement"];
  excludeKinds?: string[];
};

export type CatalogRecommendation = {
  item: CatalogDiscoveryItem;
  reasons: string[];
};

export type SurpriseOptions = CatalogContext & {
  collectionId?: CatalogCollectionId;
  seed?: number | string;
};

type CollectionRule = {
  id: Exclude<CatalogCollectionId, "recently-added">;
  title: string;
  description: string;
  include: (item: CatalogDiscoveryItem) => boolean;
};

const has = (item: CatalogDiscoveryItem, ...tags: string[]) => tags.some((tag) => item.tags.includes(tag));

const COLLECTION_RULES: readonly CollectionRule[] = [
  {
    id: "cozy-reading",
    title: "Cozy reading corner",
    description: "Seats, gentle lights, books, and soft details.",
    include: (item) => has(item, "seating", "task-light", "books", "soft-furnishing", "personal"),
  },
  {
    id: "music-room",
    title: "Music room",
    description: "Things to play, listen to, and settle in beside.",
    include: (item) => has(item, "music", "seating", "ambient-light", "storage"),
  },
  {
    id: "study-setup",
    title: "Study setup",
    description: "A practical desk space with focused light and storage.",
    include: (item) => has(item, "workspace", "surface", "task-light", "storage"),
  },
  {
    id: "plant-filled",
    title: "Plant-filled room",
    description: "Greenery, natural textures, and places for pots to rest.",
    include: (item) => has(item, "plant", "surface", "natural"),
  },
  {
    id: "sleepover",
    title: "Sleepover",
    description: "Extra sleeping places, soft furnishings, and shared treats.",
    include: (item) => has(item, "bed", "soft-furnishing", "snack", "game", "ambient-light"),
  },
  {
    id: "real-room-essentials",
    title: "Real-room essentials",
    description: "The practical objects drawn from the real room collection.",
    include: (item) => item.category === "realroom" || has(item, "real-room"),
  },
] as const;

function hashSeed(value: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value >>> 0;
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function spaceLabel(items: readonly CatalogDiscoveryItem[]): CatalogCollection["approximateSpace"] {
  if (!items.length) return "tiny";
  const areas = items.map((item) => Math.max(0, item.width) * Math.max(0, item.depth)).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)];
  if (median < 0.3) return "tiny";
  if (median < 1.2) return "small";
  if (median < 3) return "medium";
  return "large";
}

export class CatalogDiscovery {
  private readonly items: CatalogDiscoveryItem[];
  private readonly byKind = new Map<string, CatalogDiscoveryItem>();

  constructor(items: readonly CatalogDiscoveryItem[]) {
    this.items = items.map((item) => {
      if (!item.kind || !item.name || !Number.isFinite(item.width) || !Number.isFinite(item.depth)) {
        throw new Error("Catalog items require a kind, name, and finite dimensions.");
      }
      if (this.byKind.has(item.kind)) throw new Error(`Duplicate catalog kind: ${item.kind}`);
      const normalized = structuredClone(item);
      normalized.tags = [...new Set(normalized.tags.filter(Boolean))];
      this.byKind.set(normalized.kind, normalized);
      return normalized;
    });
  }

  allItems(): CatalogDiscoveryItem[] {
    return structuredClone(this.items);
  }

  collections(now = Date.now(), recentWindowDays = 45): CatalogCollection[] {
    const collections = COLLECTION_RULES.map((rule) => this.makeCollection(rule, this.items.filter(rule.include)));
    const cutoff = now - Math.max(1, recentWindowDays) * 86_400_000;
    const recent = this.items
      .filter((item) => typeof item.addedAt === "number" && item.addedAt >= cutoff && item.addedAt <= now)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    collections.push({
      id: "recently-added",
      title: "Recently added",
      description: "New pieces added during the last few weeks.",
      itemCount: recent.length,
      approximateSpace: spaceLabel(recent),
      kinds: recent.map((item) => item.kind),
    });
    return collections;
  }

  itemsForCollection(id: CatalogCollectionId, now = Date.now()): CatalogDiscoveryItem[] {
    const kinds = this.collections(now).find((collection) => collection.id === id)?.kinds ?? [];
    return kinds.flatMap((kind) => {
      const item = this.byKind.get(kind);
      return item ? [structuredClone(item)] : [];
    });
  }

  recommend(context: CatalogContext, limit = 12): CatalogRecommendation[] {
    const excluded = new Set(context.excludeKinds ?? []);
    return this.items
      .flatMap((item) => {
        if (excluded.has(item.kind)) return [];
        const reasons: string[] = [];
        if (context.placement && item.placement !== context.placement) return [];
        if (context.placement) reasons.push(`Fits ${context.placement} placement`);
        if (context.selectedSurfaceKind) {
          if (item.placement !== "surface") return [];
          if (item.fitsOn?.length && !item.fitsOn.includes(context.selectedSurfaceKind)) return [];
          reasons.push(`Fits on ${context.selectedSurfaceKind}`);
        }
        if (context.availableWidth !== undefined) {
          if (!Number.isFinite(context.availableWidth) || item.width > context.availableWidth) return [];
          reasons.push(`Fits ${context.availableWidth.toFixed(1)} m width`);
        }
        if (context.availableDepth !== undefined) {
          if (!Number.isFinite(context.availableDepth) || item.depth > context.availableDepth) return [];
          reasons.push(`Fits ${context.availableDepth.toFixed(1)} m depth`);
        }
        return [{ item: structuredClone(item), reasons }];
      })
      .sort((a, b) => b.reasons.length - a.reasons.length || a.item.name.localeCompare(b.item.name))
      .slice(0, Math.max(0, Math.floor(limit)));
  }

  surprise(options: SurpriseOptions = {}): CatalogRecommendation | undefined {
    const pool = options.collectionId
      ? this.itemsForCollection(options.collectionId)
      : this.items;
    const allowedKinds = new Set(pool.map((item) => item.kind));
    const recommendations = this.recommend(options, this.items.length).filter(({ item }) => allowedKinds.has(item.kind));
    if (!recommendations.length) return undefined;
    const seed = hashSeed(options.seed ?? 0x6d2b79f5);
    return structuredClone(recommendations[seed % recommendations.length]);
  }

  private makeCollection(rule: CollectionRule, items: CatalogDiscoveryItem[]): CatalogCollection {
    return {
      id: rule.id,
      title: rule.title,
      description: rule.description,
      itemCount: items.length,
      approximateSpace: spaceLabel(items),
      kinds: items.map((item) => item.kind),
    };
  }
}

export type CatalogPreviewTask<T> = {
  key: string;
  render: (signal: AbortSignal) => T | Promise<T>;
};

export class CatalogPreviewQueue<T> {
  private readonly cache = new Map<string, T>();
  private readonly pending: Array<{
    task: CatalogPreviewTask<T>;
    controller: AbortController;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
  }> = [];
  private running = false;

  constructor(
    private readonly assetVersion: string,
    frameBudgetMs = 8,
    private readonly now: () => number = performance.now.bind(performance),
    private readonly yieldFrame: () => Promise<void> = () =>
      new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
      }),
  ) {
    this.frameBudgetMs = Math.max(0.5, Math.min(8, frameBudgetMs));
  }

  private readonly frameBudgetMs: number;

  schedule(task: CatalogPreviewTask<T>): { promise: Promise<T>; cancel: () => void } {
    const key = `${this.assetVersion}:${task.key}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return { promise: Promise.resolve(cached), cancel: () => {} };
    const controller = new AbortController();
    let queued:
      | {
          task: CatalogPreviewTask<T>;
          controller: AbortController;
          resolve: (value: T) => void;
          reject: (reason: unknown) => void;
        }
      | undefined;
    const promise = new Promise<T>((resolve, reject) => {
      queued = { task: { ...task, key }, controller, resolve, reject };
      this.pending.push(queued);
      void this.drain();
    });
    return {
      promise,
      cancel: () => {
        controller.abort();
        const index = this.pending.findIndex((entry) => entry.controller === controller);
        if (index >= 0) {
          this.pending.splice(index, 1);
          queued?.reject(new DOMException("Preview cancelled", "AbortError"));
        }
      },
    };
  }

  clear(): void {
    this.pending.splice(0).forEach((entry) => {
      entry.controller.abort();
      entry.reject(new DOMException("Preview queue cleared", "AbortError"));
    });
    this.cache.clear();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length) {
        const frameStart = this.now();
        while (this.pending.length && this.now() - frameStart < this.frameBudgetMs) {
          const entry = this.pending.shift()!;
          if (entry.controller.signal.aborted) {
            entry.reject(new DOMException("Preview cancelled", "AbortError"));
            continue;
          }
          try {
            const value = await entry.task.render(entry.controller.signal);
            if (entry.controller.signal.aborted) {
              entry.reject(new DOMException("Preview cancelled", "AbortError"));
              continue;
            }
            this.cache.set(entry.task.key, value);
            entry.resolve(value);
          } catch (error) {
            entry.reject(error);
          }
        }
        if (this.pending.length) await this.yieldFrame();
      }
    } finally {
      this.running = false;
    }
  }
}
