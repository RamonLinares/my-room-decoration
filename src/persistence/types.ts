export const PERSISTENCE_SCHEMA_VERSION = 1;

export type RoomDesign = unknown;

export type RoomRecord = {
  id: string;
  schemaVersion: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  design: RoomDesign;
  thumbnail?: Blob;
  thumbnailMetadata?: RoomThumbnailMetadata;
  archived?: boolean;
  archivedAt?: number;
  purgeAfter?: number;
};

export type RoomThumbnailMetadata = {
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
  generatedAt: number;
  alt: string;
};

export type RoomCardMetadata = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objectCount: number;
  storyId?: string;
  storyTitle?: string;
  templateId?: string;
  archived: boolean;
  recoverUntil?: number;
  thumbnail?: RoomThumbnailMetadata;
};

export type RoomSnapshot = {
  id: string;
  roomId: string;
  schemaVersion: number;
  createdAt: number;
  reason: string;
  design: RoomDesign;
};

export type ScrapbookMetadata = {
  storyId?: string;
  storyTitle?: string;
  caption?: string;
  lighting?: "afternoon" | "evening" | string;
  camera?: Record<string, unknown>;
  tags?: string[];
};

export type ScrapbookEntry = {
  id: string;
  roomId: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  image: Blob;
  metadata: ScrapbookMetadata;
};

export type PersistedSettings = Record<string, unknown>;

export type PersistencePreferences = {
  settings: PersistedSettings;
  favorites: string[];
  recents: string[];
  placementHintComplete: boolean;
  walkHintDismissed: boolean;
};

export type LegacyMigrationResult = {
  migrated: boolean;
  roomId?: string;
  warnings: string[];
};

export type PersistenceIssueCode =
  | "blocked"
  | "corrupt-data"
  | "not-found"
  | "quota"
  | "unavailable"
  | "unknown"
  | "version";

export type PersistenceIssue = {
  operation: string;
  code: PersistenceIssueCode;
  message: string;
  recoverable: boolean;
  cause?: unknown;
};

export type StorageEstimate = {
  usage?: number;
  quota?: number;
  available?: number;
  usageRatio?: number;
};

export type PersistenceOptions = {
  dbName?: string;
  snapshotLimitPerRoom?: number;
  snapshotRetentionMs?: number;
  snapshotHardLimitPerRoom?: number;
  onIssue?: (issue: PersistenceIssue) => void;
  legacyStorage?: Storage;
  now?: () => number;
};

export type CreateRoomInput = {
  name: string;
  design: RoomDesign;
  thumbnail?: Blob;
};

export type ImportRoomInput = {
  id?: string;
  name?: string;
  design: RoomDesign;
  thumbnail?: Blob;
  createdAt?: number;
  updatedAt?: number;
};

export type SaveScrapbookInput = {
  id?: string;
  roomId: string;
  image: Blob;
  metadata?: ScrapbookMetadata;
  createdAt?: number;
};
