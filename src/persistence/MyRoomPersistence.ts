import {
  PERSISTENCE_SCHEMA_VERSION,
  type CreateRoomInput,
  type ImportRoomInput,
  type LegacyMigrationResult,
  type PersistenceIssue,
  type PersistenceIssueCode,
  type PersistenceOptions,
  type PersistencePreferences,
  type RoomDesign,
  type RoomRecord,
  type RoomSnapshot,
  type SaveScrapbookInput,
  type ScrapbookEntry,
  type StorageEstimate,
} from "./types";

const DATABASE_NAME = "my-little-room";
const DATABASE_VERSION = 1;
const DEFAULT_SNAPSHOT_LIMIT = 20;
const DEFAULT_SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
const DEFAULT_SNAPSHOT_HARD_LIMIT = 200;

const STORES = {
  rooms: "rooms",
  snapshots: "snapshots",
  scrapbook: "scrapbook",
  meta: "meta",
} as const;

const META_KEYS = {
  preferences: "preferences",
  legacyMigration: "legacy-migration-v1",
} as const;

const LEGACY_KEYS = {
  room: "my-little-room-v1",
  settings: "my-little-room-settings-v1",
  favorites: "my-little-room-favorites-v1",
  recents: "my-little-room-recent-v1",
  placementHint: "my-little-room-placement-hint-v1",
  walkHint: "my-little-room-walk-hint-v1",
} as const;

type MetaRecord<T = unknown> = { key: string; value: T; updatedAt: number };
type StoredRoomRecord = Omit<RoomRecord, "thumbnail"> & {
  thumbnailData?: ArrayBuffer;
  thumbnailType?: string;
};
type StoredScrapbookEntry = Omit<ScrapbookEntry, "image"> & {
  imageData: ArrayBuffer;
  imageType: string;
};
type PendingRoomWrite = { room: RoomRecord; resolvers: PendingResolver[] };
type PendingResolver = {
  resolve: (value: RoomRecord) => void;
  reject: (reason: unknown) => void;
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function uniqueStrings(value: unknown, limit = 200): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item || result.includes(item)) continue;
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
}

function safeClone<T>(value: T): T {
  return structuredClone(value);
}

function remapItemIds(design: RoomDesign): RoomDesign {
  const clone = safeClone(design);
  const items = Array.isArray(clone)
    ? clone
    : clone && typeof clone === "object" && Array.isArray((clone as { items?: unknown }).items)
      ? (clone as { items: unknown[] }).items
      : undefined;
  if (!items) return clone;

  const idMap = new Map<string, string>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id === "string") {
      const nextId = crypto.randomUUID();
      idMap.set(record.id, nextId);
      record.id = nextId;
    }
  }
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.supportId === "string") {
      record.supportId = idMap.get(record.supportId);
    }
  }
  return clone;
}

export class MyRoomPersistence {
  private readonly dbName: string;
  private readonly snapshotLimit: number;
  private readonly snapshotRetentionMs: number;
  private readonly snapshotHardLimit: number;
  private readonly onIssue?: (issue: PersistenceIssue) => void;
  private readonly legacyStorage?: Storage;
  private readonly now: () => number;
  private db?: IDBDatabase;
  private opening?: Promise<IDBDatabase>;
  private readonly pendingRooms = new Map<string, PendingRoomWrite>();
  private flushPromise?: Promise<void>;
  private pagehideHandler?: () => void;
  private pagehideTarget?: Window;

  constructor(options: PersistenceOptions = {}) {
    this.dbName = options.dbName ?? DATABASE_NAME;
    const requestedLimit = options.snapshotLimitPerRoom ?? DEFAULT_SNAPSHOT_LIMIT;
    this.snapshotLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.floor(requestedLimit))
      : DEFAULT_SNAPSHOT_LIMIT;
    const requestedRetention = options.snapshotRetentionMs ??
      (options.snapshotLimitPerRoom === undefined ? DEFAULT_SNAPSHOT_RETENTION_MS : 0);
    this.snapshotRetentionMs = Math.max(
      0,
      Number.isFinite(requestedRetention) ? requestedRetention : DEFAULT_SNAPSHOT_RETENTION_MS,
    );
    const requestedHardLimit = options.snapshotHardLimitPerRoom ?? DEFAULT_SNAPSHOT_HARD_LIMIT;
    this.snapshotHardLimit = Math.max(
      this.snapshotLimit,
      Number.isFinite(requestedHardLimit)
        ? Math.floor(requestedHardLimit)
        : DEFAULT_SNAPSHOT_HARD_LIMIT,
    );
    this.onIssue = options.onIssue;
    this.legacyStorage = options.legacyStorage ??
      (typeof localStorage === "undefined" ? undefined : localStorage);
    this.now = options.now ?? Date.now;
  }

  async open(): Promise<this> {
    await this.database();
    return this;
  }

  close(): void {
    this.removePagehideFlush();
    this.db?.close();
    this.db = undefined;
    this.opening = undefined;
  }

  async deleteDatabase(): Promise<void> {
    await this.flushPendingWrites();
    this.close();
    if (typeof indexedDB === "undefined") return;
    const request = indexedDB.deleteDatabase(this.dbName);
    await requestResult(request);
  }

  installPagehideFlush(target: Window = window): () => void {
    this.removePagehideFlush();
    const handler = () => {
      void this.flushPendingWrites();
    };
    this.pagehideHandler = handler;
    this.pagehideTarget = target;
    target.addEventListener("pagehide", handler, { capture: true });
    return () => {
      target.removeEventListener("pagehide", handler, { capture: true });
      if (this.pagehideHandler === handler) {
        this.pagehideHandler = undefined;
        this.pagehideTarget = undefined;
      }
    };
  }

  scheduleRoomSave(room: RoomRecord): Promise<RoomRecord> {
    const next = this.normalizeRoom(room);
    return new Promise<RoomRecord>((resolve, reject) => {
      const current = this.pendingRooms.get(next.id);
      this.pendingRooms.set(next.id, {
        room: next,
        resolvers: [...(current?.resolvers ?? []), { resolve, reject }],
      });
      queueMicrotask(() => void this.flushPendingWrites());
    });
  }

  async flushPendingWrites(): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    const entries = [...this.pendingRooms.values()];
    if (!entries.length) return;
    this.pendingRooms.clear();
    this.flushPromise = this.writePendingRooms(entries).finally(() => {
      this.flushPromise = undefined;
      if (this.pendingRooms.size) void this.flushPendingWrites();
    });
    return this.flushPromise;
  }

  async createRoom(input: CreateRoomInput): Promise<RoomRecord> {
    const timestamp = this.now();
    const room: RoomRecord = {
      id: crypto.randomUUID(),
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      name: this.cleanName(input.name),
      createdAt: timestamp,
      updatedAt: timestamp,
      design: safeClone(input.design),
      thumbnail: input.thumbnail,
    };
    await this.put(STORES.rooms, await this.serializeRoom(room), "create-room");
    return room;
  }

  async importRoom(input: ImportRoomInput): Promise<RoomRecord> {
    const timestamp = this.now();
    const room: RoomRecord = {
      id: crypto.randomUUID(),
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      name: this.cleanName(input.name ?? "Imported room"),
      createdAt: timestamp,
      updatedAt: timestamp,
      design: remapItemIds(input.design),
      thumbnail: input.thumbnail,
    };
    await this.put(STORES.rooms, await this.serializeRoom(room), "import-room");
    return room;
  }

  async saveRoom(room: RoomRecord): Promise<RoomRecord> {
    const next = this.normalizeRoom(room);
    await this.put(STORES.rooms, await this.serializeRoom(next), "save-room");
    return next;
  }

  async getRoom(id: string): Promise<RoomRecord | undefined> {
    const room = await this.get<StoredRoomRecord>(STORES.rooms, id, "get-room");
    return room ? this.deserializeRoom(room) : undefined;
  }

  async listRooms(options: { includeArchived?: boolean } = {}): Promise<RoomRecord[]> {
    const stored = await this.getAll<StoredRoomRecord>(STORES.rooms, "list-rooms");
    const rooms = stored.map((room) => this.deserializeRoom(room));
    return rooms
      .filter((room) => options.includeArchived || !room.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteRoom(id: string): Promise<void> {
    await this.runTransaction(
      [STORES.rooms, STORES.snapshots, STORES.scrapbook],
      "readwrite",
      "delete-room",
      async (transaction) => {
        transaction.objectStore(STORES.rooms).delete(id);
        await this.deleteByIndex(transaction.objectStore(STORES.snapshots).index("roomId"), id);
        await this.deleteByIndex(transaction.objectStore(STORES.scrapbook).index("roomId"), id);
      },
    );
  }

  async createSnapshot(roomId: string, design: RoomDesign, reason: string): Promise<RoomSnapshot> {
    const snapshot: RoomSnapshot = {
      id: crypto.randomUUID(),
      roomId,
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      createdAt: this.now(),
      reason: reason.trim().slice(0, 120) || "checkpoint",
      design: safeClone(design),
    };
    await this.runTransaction(
      [STORES.rooms, STORES.snapshots],
      "readwrite",
      "create-snapshot",
      async (transaction) => {
        const room = await requestResult(transaction.objectStore(STORES.rooms).get(roomId));
        if (!room) {
          throw this.report(
            "create-snapshot",
            "not-found",
            "The room for this snapshot no longer exists.",
            true,
          );
        }
        const store = transaction.objectStore(STORES.snapshots);
        store.put(snapshot);
        const existing = await requestResult(store.index("roomIdCreatedAt").getAll(IDBKeyRange.bound(
          [roomId, 0],
          [roomId, Number.MAX_SAFE_INTEGER],
        )) as IDBRequest<RoomSnapshot[]>);
        const ordered = existing.sort((a, b) => b.createdAt - a.createdAt);
        const retentionCutoff = this.now() - this.snapshotRetentionMs;
        ordered.forEach((old, index) => {
          const beyondHardLimit = index >= this.snapshotHardLimit;
          const beyondCountAndAge =
            index >= this.snapshotLimit && old.createdAt < retentionCutoff;
          if (beyondHardLimit || beyondCountAndAge) store.delete(old.id);
        });
      },
    );
    return snapshot;
  }

  async listSnapshots(roomId: string): Promise<RoomSnapshot[]> {
    const snapshots = await this.getAllByIndex<RoomSnapshot>(
      STORES.snapshots,
      "roomId",
      roomId,
      "list-snapshots",
    );
    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteSnapshot(id: string): Promise<void> {
    await this.remove(STORES.snapshots, id, "delete-snapshot");
  }

  async saveScrapbookEntry(input: SaveScrapbookInput): Promise<ScrapbookEntry> {
    if (!(input.image instanceof Blob) || input.image.size === 0) {
      throw this.report("save-scrapbook", "corrupt-data", "Scrapbook image is empty or invalid.", true);
    }
    const timestamp = this.now();
    const entry: ScrapbookEntry = {
      id: input.id || crypto.randomUUID(),
      roomId: input.roomId,
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
      image: input.image,
      metadata: safeClone(input.metadata ?? {}),
    };
    const stored: StoredScrapbookEntry = {
      ...entry,
      imageData: await input.image.arrayBuffer(),
      imageType: input.image.type || "application/octet-stream",
    };
    delete (stored as Partial<ScrapbookEntry>).image;
    await this.runTransaction(
      [STORES.rooms, STORES.scrapbook],
      "readwrite",
      "save-scrapbook",
      async (transaction) => {
        const room = await requestResult(transaction.objectStore(STORES.rooms).get(input.roomId));
        if (!room) {
          throw this.report(
            "save-scrapbook",
            "not-found",
            "The room for this scrapbook entry no longer exists.",
            true,
          );
        }
        transaction.objectStore(STORES.scrapbook).put(stored);
      },
    );
    return entry;
  }

  async listScrapbookEntries(roomId?: string): Promise<ScrapbookEntry[]> {
    const stored = roomId
      ? await this.getAllByIndex<StoredScrapbookEntry>(STORES.scrapbook, "roomId", roomId, "list-scrapbook")
      : await this.getAll<StoredScrapbookEntry>(STORES.scrapbook, "list-scrapbook");
    const entries = stored.map(({ imageData, imageType, ...entry }) => ({
      ...entry,
      image: new Blob([imageData], { type: imageType }),
    }));
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteScrapbookEntry(id: string): Promise<void> {
    await this.remove(STORES.scrapbook, id, "delete-scrapbook");
  }

  async getPreferences(): Promise<PersistencePreferences> {
    const record = await this.get<MetaRecord<PersistencePreferences>>(
      STORES.meta,
      META_KEYS.preferences,
      "get-preferences",
    );
    return record?.value ?? this.defaultPreferences();
  }

  async savePreferences(preferences: PersistencePreferences): Promise<PersistencePreferences> {
    const normalized: PersistencePreferences = {
      settings: safeClone(preferences.settings ?? {}),
      favorites: uniqueStrings(preferences.favorites),
      recents: uniqueStrings(preferences.recents, 24),
      placementHintComplete: Boolean(preferences.placementHintComplete),
      walkHintDismissed: Boolean(preferences.walkHintDismissed),
    };
    await this.put(
      STORES.meta,
      { key: META_KEYS.preferences, value: normalized, updatedAt: this.now() },
      "save-preferences",
    );
    return normalized;
  }

  async migrateLegacyLocalStorage(): Promise<LegacyMigrationResult> {
    const storage = this.legacyStorage;
    if (!storage) return { migrated: false, warnings: ["Legacy localStorage is unavailable."] };
    const marker = await this.get<MetaRecord<{ roomId?: string }>>(
      STORES.meta,
      META_KEYS.legacyMigration,
      "legacy-migration-check",
    );
    if (marker) return { migrated: false, roomId: marker.value.roomId, warnings: [] };

    const warnings: string[] = [];
    const parse = <T>(key: string, fallback: T): T => {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        warnings.push(`${key} contained invalid JSON and was skipped.`);
        return fallback;
      }
    };
    const settings = parse<Record<string, unknown>>(LEGACY_KEYS.settings, {});
    const design = parse<unknown>(LEGACY_KEYS.room, undefined);
    const preferences: PersistencePreferences = {
      settings: settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {},
      favorites: uniqueStrings(parse<unknown>(LEGACY_KEYS.favorites, [])),
      recents: uniqueStrings(parse<unknown>(LEGACY_KEYS.recents, []), 24),
      placementHintComplete: storage.getItem(LEGACY_KEYS.placementHint) === "complete",
      walkHintDismissed: storage.getItem(LEGACY_KEYS.walkHint) === "dismissed",
    };
    const hasRoom = Array.isArray(design) || (design !== undefined && design !== null);
    const timestamp = this.now();
    const roomId = hasRoom ? crypto.randomUUID() : undefined;
    const room: RoomRecord | undefined = roomId
      ? {
          id: roomId,
          schemaVersion: PERSISTENCE_SCHEMA_VERSION,
          name: this.cleanName(typeof settings.name === "string" ? settings.name : "A room of your own"),
          createdAt: timestamp,
          updatedAt: timestamp,
          design: safeClone(design),
        }
      : undefined;

    await this.runTransaction(
      [STORES.rooms, STORES.meta],
      "readwrite",
      "migrate-legacy",
      async (transaction) => {
        if (room) transaction.objectStore(STORES.rooms).put(room);
        const meta = transaction.objectStore(STORES.meta);
        meta.put({ key: META_KEYS.preferences, value: preferences, updatedAt: timestamp });
        meta.put({
          key: META_KEYS.legacyMigration,
          value: { completedAt: timestamp, roomId, sourceVersion: 1 },
          updatedAt: timestamp,
        });
      },
    );
    return { migrated: true, roomId, warnings };
  }

  async estimateStorage(): Promise<StorageEstimate> {
    try {
      const estimate = await navigator.storage?.estimate();
      const usage = estimate?.usage;
      const quota = estimate?.quota;
      return {
        usage,
        quota,
        available: quota === undefined || usage === undefined ? undefined : Math.max(0, quota - usage),
        usageRatio: quota && usage !== undefined ? usage / quota : undefined,
      };
    } catch (error) {
      this.report("estimate-storage", "unknown", "Storage usage could not be estimated.", true, error);
      return {};
    }
  }

  private async database(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.opening) return this.opening;
    if (typeof indexedDB === "undefined") {
      throw this.report("open", "unavailable", "This browser does not support IndexedDB.", false);
    }
    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORES.rooms)) {
          const rooms = database.createObjectStore(STORES.rooms, { keyPath: "id" });
          rooms.createIndex("updatedAt", "updatedAt");
        }
        if (!database.objectStoreNames.contains(STORES.snapshots)) {
          const snapshots = database.createObjectStore(STORES.snapshots, { keyPath: "id" });
          snapshots.createIndex("roomId", "roomId");
          snapshots.createIndex("roomIdCreatedAt", ["roomId", "createdAt"]);
        }
        if (!database.objectStoreNames.contains(STORES.scrapbook)) {
          const scrapbook = database.createObjectStore(STORES.scrapbook, { keyPath: "id" });
          scrapbook.createIndex("roomId", "roomId");
          scrapbook.createIndex("createdAt", "createdAt");
        }
        if (!database.objectStoreNames.contains(STORES.meta)) {
          database.createObjectStore(STORES.meta, { keyPath: "key" });
        }
      };
      request.onblocked = () => {
        this.onIssue?.({
          operation: "open",
          code: "blocked",
          message: "Room storage upgrade is blocked by another open tab.",
          recoverable: true,
        });
      };
      request.onerror = () => {
        const error = request.error ?? new Error("IndexedDB could not be opened");
        reject(this.normalizeError("open", error));
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          if (this.db === database) this.db = undefined;
          this.onIssue?.({
            operation: "version-change",
            code: "version",
            message: "Room storage was updated in another tab. Reload to continue saving.",
            recoverable: true,
          });
        };
        this.db = database;
        resolve(database);
      };
    }).finally(() => {
      this.opening = undefined;
    });
    return this.opening;
  }

  private async writePendingRooms(entries: PendingRoomWrite[]): Promise<void> {
    try {
      const storedRooms = await Promise.all(entries.map(({ room }) => this.serializeRoom(room)));
      await this.runTransaction([STORES.rooms], "readwrite", "flush-rooms", async (transaction) => {
        const store = transaction.objectStore(STORES.rooms);
        storedRooms.forEach((room) => store.put(room));
      });
      entries.forEach(({ room, resolvers }) => resolvers.forEach(({ resolve }) => resolve(room)));
    } catch (error) {
      entries.forEach(({ resolvers }) => resolvers.forEach(({ reject }) => reject(error)));
      throw error;
    }
  }

  private normalizeRoom(room: RoomRecord): RoomRecord {
    const createdAt = Number.isFinite(room.createdAt) ? room.createdAt : this.now();
    return {
      ...safeClone(room),
      id: room.id || crypto.randomUUID(),
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      name: this.cleanName(room.name),
      createdAt,
      updatedAt: this.now(),
    };
  }

  private async serializeRoom(room: RoomRecord): Promise<StoredRoomRecord> {
    const { thumbnail, ...record } = room;
    return {
      ...record,
      thumbnailData: thumbnail ? await thumbnail.arrayBuffer() : undefined,
      thumbnailType: thumbnail?.type,
    };
  }

  private deserializeRoom(room: StoredRoomRecord): RoomRecord {
    const { thumbnailData, thumbnailType, ...record } = room;
    return {
      ...record,
      thumbnail: thumbnailData
        ? new Blob([thumbnailData], { type: thumbnailType || "application/octet-stream" })
        : undefined,
    };
  }

  private cleanName(name: string): string {
    return name.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 60) || "Untitled room";
  }

  private defaultPreferences(): PersistencePreferences {
    return {
      settings: {},
      favorites: [],
      recents: [],
      placementHintComplete: false,
      walkHintDismissed: false,
    };
  }

  private removePagehideFlush(): void {
    if (this.pagehideHandler && this.pagehideTarget) {
      this.pagehideTarget.removeEventListener("pagehide", this.pagehideHandler, { capture: true });
      this.pagehideHandler = undefined;
      this.pagehideTarget = undefined;
    }
  }

  private async deleteByIndex(index: IDBIndex, key: IDBValidKey): Promise<void> {
    const keys = await requestResult(index.getAllKeys(IDBKeyRange.only(key)));
    keys.forEach((primaryKey) => index.objectStore.delete(primaryKey));
  }

  private async runTransaction(
    stores: string[],
    mode: IDBTransactionMode,
    operation: string,
    action: (transaction: IDBTransaction) => Promise<void>,
  ): Promise<void> {
    try {
      const database = await this.database();
      const transaction = database.transaction(stores, mode, { durability: "strict" });
      const done = transactionDone(transaction);
      await action(transaction);
      await done;
    } catch (error) {
      throw this.normalizeError(operation, error);
    }
  }

  private async put(storeName: string, value: unknown, operation: string): Promise<void> {
    await this.runTransaction([storeName], "readwrite", operation, async (transaction) => {
      transaction.objectStore(storeName).put(value);
    });
  }

  private async remove(storeName: string, key: IDBValidKey, operation: string): Promise<void> {
    await this.runTransaction([storeName], "readwrite", operation, async (transaction) => {
      transaction.objectStore(storeName).delete(key);
    });
  }

  private async get<T>(storeName: string, key: IDBValidKey, operation: string): Promise<T | undefined> {
    let result: T | undefined;
    await this.runTransaction([storeName], "readonly", operation, async (transaction) => {
      result = await requestResult(transaction.objectStore(storeName).get(key)) as T | undefined;
    });
    return result;
  }

  private async getAll<T>(storeName: string, operation: string): Promise<T[]> {
    let result: T[] = [];
    await this.runTransaction([storeName], "readonly", operation, async (transaction) => {
      result = await requestResult(transaction.objectStore(storeName).getAll()) as T[];
    });
    return result;
  }

  private async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey,
    operation: string,
  ): Promise<T[]> {
    let result: T[] = [];
    await this.runTransaction([storeName], "readonly", operation, async (transaction) => {
      result = await requestResult(transaction.objectStore(storeName).index(indexName).getAll(query)) as T[];
    });
    return result;
  }

  private normalizeError(operation: string, error: unknown): PersistenceIssue {
    if (this.isIssue(error)) return error;
    return this.report(
      operation,
      isQuotaError(error) ? "quota" : "unknown",
      isQuotaError(error)
        ? "Browser storage is full. Export or remove older rooms and scrapbook photos, then try again."
        : `Room storage failed during ${operation}.`,
      true,
      error,
    );
  }

  private report(
    operation: string,
    code: PersistenceIssueCode,
    message: string,
    recoverable: boolean,
    cause?: unknown,
  ): PersistenceIssue {
    const issue: PersistenceIssue = { operation, code, message, recoverable, cause };
    this.onIssue?.(issue);
    return issue;
  }

  private isIssue(value: unknown): value is PersistenceIssue {
    return Boolean(
      value &&
      typeof value === "object" &&
      "operation" in value &&
      "code" in value &&
      "recoverable" in value,
    );
  }
}
