export const SHARE_PACKAGE_SCHEMA = 'my-little-room/share-package' as const;
export const SHARE_PACKAGE_VERSION = 1 as const;
export const DEFAULT_HASH_BYTE_LIMIT = 24_000;
export const DEFAULT_FILE_BYTE_LIMIT = 1_000_000;

export type ShareRoomShape = 'rectangle' | 'l' | 't' | 'u';
export type ShareWallStyle =
  | 'paint'
  | 'linen'
  | 'pinstripe'
  | 'gingham'
  | 'botanical'
  | 'scallop'
  | 'tiny-floral'
  | 'soft-brick';
export type ShareFloorStyle =
  | 'planks'
  | 'herringbone'
  | 'parquet'
  | 'checker'
  | 'tile'
  | 'terrazzo'
  | 'cork'
  | 'concrete';

const WALL_STYLES: ShareWallStyle[] = [
  'paint', 'linen', 'pinstripe', 'gingham', 'botanical', 'scallop', 'tiny-floral', 'soft-brick',
];
const FLOOR_STYLES: ShareFloorStyle[] = [
  'planks', 'herringbone', 'parquet', 'checker', 'tile', 'terrazzo', 'cork', 'concrete',
];

export type ShareRoomSettings = {
  name: string;
  width: number;
  depth: number;
  shape: ShareRoomShape;
  shapeWidth: number;
  crossbarDepth: number;
  wallColor: number;
  floorColor: number;
  wallStyle: ShareWallStyle;
  floorStyle: ShareFloorStyle;
};

export type ShareJsonValue =
  | null
  | boolean
  | number
  | string
  | ShareJsonValue[]
  | { [key: string]: ShareJsonValue };

export type ShareStoryState = {
  id: string;
  title: string;
  status: 'active' | 'complete' | 'dismissed' | 'sandbox';
  stepId?: string;
  completedAt?: string;
  featuredObjectId?: string;
  progress?: { [key: string]: ShareJsonValue };
};

export type SharePackageMetadata = {
  templateId?: string;
  templateName?: string;
  description?: string;
  tags?: string[];
  favoriteObjectId?: string;
  palette?: number[];
  custom?: { [key: string]: ShareJsonValue };
};

export type ShareRoomItem = {
  id: string;
  kind: string;
  name: string;
  category: string;
  x: number;
  y?: number;
  z: number;
  rot: number;
  color: number;
  scale?: number;
  supportId?: string;
  interaction?: { [key: string]: ShareJsonValue };
};

export type SharePreferences = {
  evening?: boolean;
  gridSnap?: boolean;
};

export type SharePackage = {
  schema: typeof SHARE_PACKAGE_SCHEMA;
  version: typeof SHARE_PACKAGE_VERSION;
  createdAt: string;
  room: ShareRoomSettings;
  items: ShareRoomItem[];
  preferences?: SharePreferences;
  story?: ShareStoryState;
  metadata?: SharePackageMetadata;
};

export type SharePackageInput = Omit<SharePackage, 'schema' | 'version' | 'createdAt'> & {
  createdAt?: string;
};

export type ShareCodecOptions = {
  maxBytes?: number;
  maxItems?: number;
  remapIds?: boolean;
  idFactory?: () => string;
};

export type ImportedSharePackage = {
  package: SharePackage;
  idMap: Map<string, string>;
};

export type SharePackagePreview = {
  name: string;
  createdAt: string;
  dimensions: string;
  shape: ShareRoomShape;
  itemCount: number;
  supportedItemCount: number;
  interactiveItemCount: number;
  story?: Pick<ShareStoryState, 'id' | 'title' | 'status'>;
  templateName?: string;
  tags: string[];
  text: string;
};

export type SharePackageInspection = {
  package: SharePackage;
  preview: SharePackagePreview;
};

export class SharePackageError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid-encoding'
      | 'invalid-json'
      | 'invalid-package'
      | 'size-limit'
      | 'unsupported-version',
  ) {
    super(message);
    this.name = 'SharePackageError';
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SharePackageError(`${label} must be an object.`, 'invalid-package');
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new SharePackageError(`${label} must be text.`, 'invalid-package');
  }
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > maxLength) {
    throw new SharePackageError(`${label} must contain 1 to ${maxLength} characters.`, 'invalid-package');
  }
  return clean;
}

function numberValue(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new SharePackageError(`${label} is outside the supported range.`, 'invalid-package');
  }
  return value;
}

function optionalNumber(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number | undefined {
  return value === undefined ? undefined : numberValue(value, label, min, max);
}

function safeJsonValue(value: unknown, label: string, depth = 0): ShareJsonValue {
  if (depth > 5) {
    throw new SharePackageError(`${label} is nested too deeply.`, 'invalid-package');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new SharePackageError(`${label} contains a non-finite number.`, 'invalid-package');
    return value;
  }
  if (typeof value === 'string') {
    const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1_001);
    if (clean.length > 1_000) throw new SharePackageError(`${label} is too long.`, 'invalid-package');
    return clean;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new SharePackageError(`${label} contains too many entries.`, 'invalid-package');
    return value.map((entry, index) => safeJsonValue(entry, `${label}[${index}]`, depth + 1));
  }
  const source = record(value, label);
  const entries = Object.entries(source);
  if (entries.length > 50) throw new SharePackageError(`${label} contains too many properties.`, 'invalid-package');
  const result: { [key: string]: ShareJsonValue } = Object.create(null) as { [key: string]: ShareJsonValue };
  for (const [key, entry] of entries) {
    const safeKey = stringValue(key, `${label} property`, 80);
    if (['__proto__', 'prototype', 'constructor'].includes(safeKey)) {
      throw new SharePackageError(`${label} contains a reserved property.`, 'invalid-package');
    }
    result[safeKey] = safeJsonValue(entry, `${label}.${safeKey}`, depth + 1);
  }
  return result;
}

function safeJsonObject(value: unknown, label: string): { [key: string]: ShareJsonValue } {
  const parsed = safeJsonValue(value, label);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new SharePackageError(`${label} must be an object.`, 'invalid-package');
  }
  return parsed;
}

function optionalIsoDate(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new SharePackageError(`${label} must be a valid date.`, 'invalid-package');
  }
  return new Date(value).toISOString();
}

function parseRoom(value: unknown): ShareRoomSettings {
  const room = record(value, 'room');
  const shape = stringValue(room.shape, 'room.shape', 20);
  if (!['rectangle', 'l', 't', 'u'].includes(shape)) {
    throw new SharePackageError('room.shape is not supported.', 'invalid-package');
  }
  const wallStyle = stringValue(room.wallStyle, 'room.wallStyle', 40);
  const floorStyle = stringValue(room.floorStyle, 'room.floorStyle', 40);
  if (!WALL_STYLES.includes(wallStyle as ShareWallStyle)) {
    throw new SharePackageError('room.wallStyle is not supported.', 'invalid-package');
  }
  if (!FLOOR_STYLES.includes(floorStyle as ShareFloorStyle)) {
    throw new SharePackageError('room.floorStyle is not supported.', 'invalid-package');
  }
  return {
    name: stringValue(room.name, 'room.name', 80),
    width: numberValue(room.width, 'room.width', 1, 100),
    depth: numberValue(room.depth, 'room.depth', 1, 100),
    shape: shape as ShareRoomShape,
    shapeWidth: numberValue(room.shapeWidth, 'room.shapeWidth', 0, 1),
    crossbarDepth: numberValue(room.crossbarDepth, 'room.crossbarDepth', 0, 1),
    wallColor: numberValue(room.wallColor, 'room.wallColor', 0, 0xffffff, true),
    floorColor: numberValue(room.floorColor, 'room.floorColor', 0, 0xffffff, true),
    wallStyle: wallStyle as ShareWallStyle,
    floorStyle: floorStyle as ShareFloorStyle,
  };
}

function parseStory(value: unknown): ShareStoryState | undefined {
  if (value === undefined) return undefined;
  const story = record(value, 'story');
  const status = stringValue(story.status, 'story.status', 20);
  if (!['active', 'complete', 'dismissed', 'sandbox'].includes(status)) {
    throw new SharePackageError('story.status is not supported.', 'invalid-package');
  }
  const result: ShareStoryState = {
    id: stringValue(story.id, 'story.id', 100),
    title: stringValue(story.title, 'story.title', 160),
    status: status as ShareStoryState['status'],
  };
  if (story.stepId !== undefined) result.stepId = stringValue(story.stepId, 'story.stepId', 100);
  if (story.featuredObjectId !== undefined) {
    result.featuredObjectId = stringValue(story.featuredObjectId, 'story.featuredObjectId', 120);
  }
  const completedAt = optionalIsoDate(story.completedAt, 'story.completedAt');
  if (completedAt) result.completedAt = completedAt;
  if (story.progress !== undefined) result.progress = safeJsonObject(story.progress, 'story.progress');
  return result;
}

function parseMetadata(value: unknown): SharePackageMetadata | undefined {
  if (value === undefined) return undefined;
  const metadata = record(value, 'metadata');
  const result: SharePackageMetadata = {};
  if (metadata.templateId !== undefined) result.templateId = stringValue(metadata.templateId, 'metadata.templateId', 100);
  if (metadata.templateName !== undefined) result.templateName = stringValue(metadata.templateName, 'metadata.templateName', 160);
  if (metadata.description !== undefined) result.description = stringValue(metadata.description, 'metadata.description', 1_000);
  if (metadata.favoriteObjectId !== undefined) {
    result.favoriteObjectId = stringValue(metadata.favoriteObjectId, 'metadata.favoriteObjectId', 120);
  }
  if (metadata.tags !== undefined) {
    if (!Array.isArray(metadata.tags) || metadata.tags.length > 30) {
      throw new SharePackageError('metadata.tags must contain at most 30 tags.', 'invalid-package');
    }
    result.tags = [...new Set(metadata.tags.map((tag, index) => stringValue(tag, `metadata.tags[${index}]`, 50)))];
  }
  if (metadata.palette !== undefined) {
    if (!Array.isArray(metadata.palette) || metadata.palette.length > 16) {
      throw new SharePackageError('metadata.palette must contain at most 16 colors.', 'invalid-package');
    }
    result.palette = metadata.palette.map((color, index) =>
      numberValue(color, `metadata.palette[${index}]`, 0, 0xffffff, true));
  }
  if (metadata.custom !== undefined) result.custom = safeJsonObject(metadata.custom, 'metadata.custom');
  return result;
}

function parseItems(value: unknown, maxItems: number): ShareRoomItem[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new SharePackageError(`items must be an array with at most ${maxItems} entries.`, 'invalid-package');
  }
  const ids = new Set<string>();
  const items = value.map((entry, index): ShareRoomItem => {
    const item = record(entry, `items[${index}]`);
    const id = stringValue(item.id, `items[${index}].id`, 120);
    if (ids.has(id)) {
      throw new SharePackageError(`items[${index}].id is duplicated.`, 'invalid-package');
    }
    ids.add(id);
    const parsed: ShareRoomItem = {
      id,
      kind: stringValue(item.kind, `items[${index}].kind`, 80),
      name: stringValue(item.name, `items[${index}].name`, 120),
      category: stringValue(item.category, `items[${index}].category`, 80),
      x: numberValue(item.x, `items[${index}].x`, -10_000, 10_000),
      z: numberValue(item.z, `items[${index}].z`, -10_000, 10_000),
      rot: numberValue(item.rot, `items[${index}].rot`, -Math.PI * 100, Math.PI * 100),
      color: numberValue(item.color, `items[${index}].color`, 0, 0xffffff, true),
    };
    const y = optionalNumber(item.y, `items[${index}].y`, -100, 1_000);
    const scale = optionalNumber(item.scale, `items[${index}].scale`, 0.02, 20);
    if (y !== undefined) parsed.y = y;
    if (scale !== undefined) parsed.scale = scale;
    if (item.supportId !== undefined) {
      parsed.supportId = stringValue(item.supportId, `items[${index}].supportId`, 120);
    }
    if (item.interaction !== undefined) {
      parsed.interaction = safeJsonObject(item.interaction, `items[${index}].interaction`);
    }
    return parsed;
  });
  for (const [index, item] of items.entries()) {
    if (item.supportId && (!ids.has(item.supportId) || item.supportId === item.id)) {
      throw new SharePackageError(`items[${index}].supportId does not identify another package item.`, 'invalid-package');
    }
  }
  for (const item of items) {
    const visited = new Set<string>([item.id]);
    let supportId = item.supportId;
    while (supportId) {
      if (visited.has(supportId)) {
        throw new SharePackageError('Item support relationships must not contain a cycle.', 'invalid-package');
      }
      visited.add(supportId);
      supportId = items.find((candidate) => candidate.id === supportId)?.supportId;
    }
  }
  return items;
}

function parsePreferences(value: unknown): SharePreferences | undefined {
  if (value === undefined) return undefined;
  const preferences = record(value, 'preferences');
  const result: SharePreferences = {};
  if (preferences.evening !== undefined) {
    if (typeof preferences.evening !== 'boolean') throw new SharePackageError('preferences.evening must be true or false.', 'invalid-package');
    result.evening = preferences.evening;
  }
  if (preferences.gridSnap !== undefined) {
    if (typeof preferences.gridSnap !== 'boolean') throw new SharePackageError('preferences.gridSnap must be true or false.', 'invalid-package');
    result.gridSnap = preferences.gridSnap;
  }
  return result;
}

/** Validation reconstructs an allow-listed package and never returns unknown input fields. */
export function validateSharePackage(value: unknown, options: Pick<ShareCodecOptions, 'maxItems'> = {}): SharePackage {
  const packageRecord = record(value, 'share package');
  if (packageRecord.schema !== SHARE_PACKAGE_SCHEMA) {
    throw new SharePackageError('This is not a My Little Room share package.', 'invalid-package');
  }
  if (packageRecord.version !== SHARE_PACKAGE_VERSION) {
    throw new SharePackageError(`Share package version ${String(packageRecord.version)} is not supported.`, 'unsupported-version');
  }
  if (typeof packageRecord.createdAt !== 'string' || !Number.isFinite(Date.parse(packageRecord.createdAt))) {
    throw new SharePackageError('createdAt must be a valid date.', 'invalid-package');
  }
  const preferences = parsePreferences(packageRecord.preferences);
  const story = parseStory(packageRecord.story);
  const metadata = parseMetadata(packageRecord.metadata);
  const result: SharePackage = {
    schema: SHARE_PACKAGE_SCHEMA,
    version: SHARE_PACKAGE_VERSION,
    createdAt: new Date(packageRecord.createdAt).toISOString(),
    room: parseRoom(packageRecord.room),
    items: parseItems(packageRecord.items, Math.max(0, Math.floor(options.maxItems ?? 1_000))),
  };
  if (preferences && Object.keys(preferences).length) result.preferences = preferences;
  if (story) result.story = story;
  if (metadata && Object.keys(metadata).length) result.metadata = metadata;
  const itemIds = new Set(result.items.map((item) => item.id));
  if (story?.featuredObjectId && !itemIds.has(story.featuredObjectId)) {
    throw new SharePackageError('story.featuredObjectId does not identify a package item.', 'invalid-package');
  }
  if (metadata?.favoriteObjectId && !itemIds.has(metadata.favoriteObjectId)) {
    throw new SharePackageError('metadata.favoriteObjectId does not identify a package item.', 'invalid-package');
  }
  return result;
}

export function createSharePackage(input: SharePackageInput): SharePackage {
  return validateSharePackage({
    ...input,
    schema: SHARE_PACKAGE_SCHEMA,
    version: SHARE_PACKAGE_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export function serializeSharePackage(value: SharePackage): string {
  return JSON.stringify(validateSharePackage(value));
}

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function assertSize(bytes: number, maxBytes: number, label: string): void {
  if (bytes > maxBytes) {
    throw new SharePackageError(`${label} is ${bytes} bytes; the limit is ${maxBytes} bytes.`, 'size-limit');
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string, maxBytes: number): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new SharePackageError('The room link contains invalid characters.', 'invalid-encoding');
  }
  const estimatedBytes = Math.ceil((value.length * 3) / 4);
  assertSize(estimatedBytes, maxBytes + 2, 'Encoded room data');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new SharePackageError('The room link could not be decoded.', 'invalid-encoding');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  assertSize(bytes.byteLength, maxBytes, 'Decoded room data');
  return bytes;
}

function defaultIdFactory(): string {
  return crypto.randomUUID();
}

export function remapSharePackageIds(
  value: SharePackage,
  idFactory: () => string = defaultIdFactory,
): ImportedSharePackage {
  const source = validateSharePackage(value);
  const idMap = new Map<string, string>();
  const generated = new Set<string>();
  const sourceIds = new Set(source.items.map((item) => item.id));
  for (const item of source.items) {
    let nextId = '';
    for (let attempts = 0; attempts < 100 && (!nextId || generated.has(nextId) || sourceIds.has(nextId)); attempts += 1) {
      nextId = stringValue(idFactory(), 'generated item id', 120);
    }
    if (!nextId || generated.has(nextId) || sourceIds.has(nextId)) {
      throw new SharePackageError('Could not generate unique item identifiers.', 'invalid-package');
    }
    generated.add(nextId);
    idMap.set(item.id, nextId);
  }
  return {
    package: {
      ...source,
      room: { ...source.room },
      items: source.items.map((item) => ({
        ...item,
        id: idMap.get(item.id)!,
        ...(item.supportId ? { supportId: idMap.get(item.supportId)! } : {}),
      })),
      ...(source.preferences ? { preferences: { ...source.preferences } } : {}),
      ...(source.story ? {
        story: {
          ...source.story,
          ...(source.story.featuredObjectId
            ? { featuredObjectId: idMap.get(source.story.featuredObjectId)! }
            : {}),
        },
      } : {}),
      ...(source.metadata ? {
        metadata: {
          ...source.metadata,
          ...(source.metadata.favoriteObjectId
            ? { favoriteObjectId: idMap.get(source.metadata.favoriteObjectId)! }
            : {}),
        },
      } : {}),
    },
    idMap,
  };
}

function importValidated(value: SharePackage, options: ShareCodecOptions): ImportedSharePackage {
  if (options.remapIds === false) return { package: value, idMap: new Map() };
  return remapSharePackageIds(value, options.idFactory);
}

export function createSharePackagePreview(value: SharePackage): SharePackagePreview {
  const source = validateSharePackage(value);
  const supportedItemCount = source.items.filter((item) => item.supportId).length;
  const interactiveItemCount = source.items.filter((item) => item.interaction).length;
  const tags = [...(source.metadata?.tags ?? [])];
  const story = source.story
    ? { id: source.story.id, title: source.story.title, status: source.story.status }
    : undefined;
  const dimensions = `${source.room.width} × ${source.room.depth} units`;
  const details = [
    `${source.items.length} ${source.items.length === 1 ? 'object' : 'objects'}`,
    interactiveItemCount ? `${interactiveItemCount} interactive` : '',
    story ? `${story.title} story (${story.status})` : '',
  ].filter(Boolean);
  return {
    name: source.room.name,
    createdAt: source.createdAt,
    dimensions,
    shape: source.room.shape,
    itemCount: source.items.length,
    supportedItemCount,
    interactiveItemCount,
    ...(story ? { story } : {}),
    ...(source.metadata?.templateName ? { templateName: source.metadata.templateName } : {}),
    tags,
    text: `${source.room.name}. ${dimensions}, ${source.room.shape} room. ${details.join(', ')}.`,
  };
}

function inspectionOf(value: SharePackage): SharePackageInspection {
  return { package: value, preview: createSharePackagePreview(value) };
}

export function encodeSharePackageHash(value: SharePackage, options: Pick<ShareCodecOptions, 'maxBytes'> = {}): string {
  const bytes = utf8Bytes(serializeSharePackage(value));
  assertSize(bytes.byteLength, options.maxBytes ?? DEFAULT_HASH_BYTE_LIMIT, 'Room link data');
  return `#room=${bytesToBase64Url(bytes)}`;
}

export function decodeSharePackageHash(hashOrUrl: string, options: ShareCodecOptions = {}): ImportedSharePackage {
  const hashStart = hashOrUrl.indexOf('#');
  const hash = (hashStart >= 0 ? hashOrUrl.slice(hashStart) : hashOrUrl).replace(/^#/, '');
  const encoded = new URLSearchParams(hash).get('room');
  if (!encoded) throw new SharePackageError('The link does not contain room data.', 'invalid-encoding');
  const bytes = base64UrlToBytes(encoded, options.maxBytes ?? DEFAULT_HASH_BYTE_LIMIT);
  return parseSharePackageBytes(bytes, options);
}

export function inspectSharePackageHash(
  hashOrUrl: string,
  options: Pick<ShareCodecOptions, 'maxBytes' | 'maxItems'> = {},
): SharePackageInspection {
  return inspectionOf(decodeSharePackageHash(hashOrUrl, { ...options, remapIds: false }).package);
}

export function parseSharePackageText(text: string, options: ShareCodecOptions = {}): ImportedSharePackage {
  const bytes = utf8Bytes(text);
  assertSize(bytes.byteLength, options.maxBytes ?? DEFAULT_FILE_BYTE_LIMIT, 'Share package');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new SharePackageError('The share package is not valid JSON.', 'invalid-json');
  }
  return importValidated(validateSharePackage(value, options), options);
}

export function inspectSharePackageText(
  text: string,
  options: Pick<ShareCodecOptions, 'maxBytes' | 'maxItems'> = {},
): SharePackageInspection {
  return inspectionOf(parseSharePackageText(text, { ...options, remapIds: false }).package);
}

export function parseSharePackageBytes(bytes: Uint8Array, options: ShareCodecOptions = {}): ImportedSharePackage {
  assertSize(bytes.byteLength, options.maxBytes ?? DEFAULT_FILE_BYTE_LIMIT, 'Share package');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SharePackageError('The share package is not valid UTF-8 text.', 'invalid-encoding');
  }
  return parseSharePackageText(text, options);
}

export function inspectSharePackageBytes(
  bytes: Uint8Array,
  options: Pick<ShareCodecOptions, 'maxBytes' | 'maxItems'> = {},
): SharePackageInspection {
  return inspectionOf(parseSharePackageBytes(bytes, { ...options, remapIds: false }).package);
}

export async function parseSharePackageBlob(blob: Blob, options: ShareCodecOptions = {}): Promise<ImportedSharePackage> {
  assertSize(blob.size, options.maxBytes ?? DEFAULT_FILE_BYTE_LIMIT, 'Share package file');
  return parseSharePackageBytes(new Uint8Array(await blob.arrayBuffer()), options);
}

export async function inspectSharePackageBlob(
  blob: Blob,
  options: Pick<ShareCodecOptions, 'maxBytes' | 'maxItems'> = {},
): Promise<SharePackageInspection> {
  return inspectionOf((await parseSharePackageBlob(blob, { ...options, remapIds: false })).package);
}

export function createSharePackageDownload(
  value: SharePackage,
  options: Pick<ShareCodecOptions, 'maxBytes'> = {},
): { blob: Blob; filename: string } {
  const text = `${serializeSharePackage(value)}\n`;
  const bytes = utf8Bytes(text);
  assertSize(bytes.byteLength, options.maxBytes ?? DEFAULT_FILE_BYTE_LIMIT, 'Share package file');
  const date = value.createdAt.slice(0, 10);
  const slug = value.room.name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'room';
  return {
    blob: new Blob([text], { type: 'application/vnd.my-little-room+json' }),
    filename: `${slug}-${date}.myroom.json`,
  };
}
