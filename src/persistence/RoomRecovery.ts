import type { RoomCardMetadata, RoomRecord, RoomThumbnailMetadata } from './types';

export const DEFAULT_DELETE_GRACE_MS = 7 * 24 * 60 * 60 * 1_000;

export type ArchiveRoomOptions = {
  now?: number;
  graceMs?: number;
};

export type RoomCardOptions = {
  objectCount?: number;
  storyId?: string;
  storyTitle?: string;
  templateId?: string;
};

export type ArchiveSweep = {
  active: RoomRecord[];
  recoverable: RoomRecord[];
  expired: RoomRecord[];
};

function timestamp(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function designItems(design: unknown): unknown[] {
  if (Array.isArray(design)) return design;
  if (design && typeof design === 'object' && Array.isArray((design as { items?: unknown }).items)) {
    return (design as { items: unknown[] }).items;
  }
  return [];
}

function nonNegativeInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function createRoomThumbnailMetadata(
  blob: Blob,
  input: { width: number; height: number; generatedAt?: number; alt?: string },
): RoomThumbnailMetadata {
  const width = Math.floor(input.width);
  const height = Math.floor(input.height);
  if (!(blob instanceof Blob) || blob.size <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new TypeError('Room thumbnails require a non-empty Blob and finite positive dimensions.');
  }
  return {
    width,
    height,
    mimeType: blob.type || 'application/octet-stream',
    byteSize: blob.size,
    generatedAt: timestamp(input.generatedAt, Date.now()),
    alt: (input.alt ?? 'Room preview').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Room preview',
  };
}

export function archiveRoomRecord(
  room: RoomRecord,
  options: ArchiveRoomOptions = {},
): RoomRecord {
  const now = timestamp(options.now, Date.now());
  const graceMs = Math.max(0, timestamp(options.graceMs, DEFAULT_DELETE_GRACE_MS));
  return {
    ...room,
    archived: true,
    archivedAt: now,
    purgeAfter: now + graceMs,
    updatedAt: Math.max(room.updatedAt, now),
  };
}

export function restoreRoomRecord(room: RoomRecord, now = Date.now()): RoomRecord {
  const restored = { ...room };
  delete restored.archivedAt;
  delete restored.purgeAfter;
  restored.archived = false;
  restored.updatedAt = Math.max(room.updatedAt, timestamp(now, Date.now()));
  return restored;
}

export function canRecoverRoom(room: RoomRecord, now = Date.now()): boolean {
  if (!room.archived) return false;
  return room.purgeAfter === undefined || timestamp(now, Date.now()) <= room.purgeAfter;
}

export function sweepRoomArchives(
  rooms: readonly RoomRecord[],
  now = Date.now(),
): ArchiveSweep {
  const current = timestamp(now, Date.now());
  const active: RoomRecord[] = [];
  const recoverable: RoomRecord[] = [];
  const expired: RoomRecord[] = [];
  for (const room of rooms) {
    if (!room.archived) active.push(room);
    else if (canRecoverRoom(room, current)) recoverable.push(room);
    else expired.push(room);
  }
  return { active, recoverable, expired };
}

export function buildRoomCardMetadata(
  room: RoomRecord,
  options: RoomCardOptions = {},
): RoomCardMetadata {
  const objectCount = options.objectCount ?? designItems(room.design).length;
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    objectCount: nonNegativeInteger(objectCount, designItems(room.design).length),
    ...(options.storyId ? { storyId: options.storyId } : {}),
    ...(options.storyTitle ? { storyTitle: options.storyTitle } : {}),
    ...(options.templateId ? { templateId: options.templateId } : {}),
    archived: Boolean(room.archived),
    ...(room.archived && room.purgeAfter !== undefined ? { recoverUntil: room.purgeAfter } : {}),
    ...(room.thumbnailMetadata ? { thumbnail: { ...room.thumbnailMetadata } } : {}),
  };
}
