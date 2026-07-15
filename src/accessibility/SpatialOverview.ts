export type SpatialRoom = {
  name?: string;
  width: number;
  depth: number;
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
};

export type SpatialItem = {
  id: string;
  name: string;
  kind?: string;
  x: number;
  y?: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  supportId?: string;
  wall?: 'back' | 'front' | 'left' | 'right';
  importance?: number;
  landmark?: boolean;
};

export type SpatialZoneId =
  | 'back-left'
  | 'back'
  | 'back-right'
  | 'left'
  | 'center'
  | 'right'
  | 'front-left'
  | 'front'
  | 'front-right';

export type SpatialZone = {
  id: SpatialZoneId;
  label: string;
  itemIds: string[];
  text: string;
};

export type SpatialRelationship = {
  type: 'supported-by' | 'against-wall' | 'near';
  subjectId: string;
  objectId?: string;
  wall?: 'back' | 'front' | 'left' | 'right';
  text: string;
};

export type SpatialLandmark = {
  itemId: string;
  name: string;
  zone: SpatialZoneId;
  text: string;
};

export type SpatialOverview = {
  summary: string;
  zones: SpatialZone[];
  landmarks: SpatialLandmark[];
  relationships: SpatialRelationship[];
  omittedItemCount: number;
  text: string;
};

export type SpatialOverviewOptions = {
  maxItemsPerZone?: number;
  maxLandmarks?: number;
  maxRelationships?: number;
  nearDistance?: number;
  wallDistance?: number;
  includeEmptyZones?: boolean;
};

const ZONE_ORDER: SpatialZoneId[] = [
  'back-left',
  'back',
  'back-right',
  'left',
  'center',
  'right',
  'front-left',
  'front',
  'front-right',
];

const ZONE_LABELS: Record<SpatialZoneId, string> = {
  'back-left': 'back left',
  back: 'back',
  'back-right': 'back right',
  left: 'left side',
  center: 'center',
  right: 'right side',
  'front-left': 'front left',
  front: 'front',
  'front-right': 'front right',
};

function finite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function cleanText(value: string | undefined, fallback: string, maxLength = 100): string {
  const cleaned = (value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function plural(count: number, singular: string, pluralValue = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function roomBounds(room: SpatialRoom) {
  const width = Math.max(0.1, Math.abs(finite(room.width, 1)));
  const depth = Math.max(0.1, Math.abs(finite(room.depth, 1)));
  const minX = finite(room.minX, -width / 2);
  const maxX = Math.max(minX + 0.1, finite(room.maxX, minX + width));
  const minZ = finite(room.minZ, -depth / 2);
  const maxZ = Math.max(minZ + 0.1, finite(room.maxZ, minZ + depth));
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function zoneFor(
  item: Pick<SpatialItem, 'x' | 'z'>,
  bounds: ReturnType<typeof roomBounds>,
): SpatialZoneId {
  const xRatio = Math.max(0, Math.min(0.999, (finite(item.x, 0) - bounds.minX) / bounds.width));
  const zRatio = Math.max(0, Math.min(0.999, (finite(item.z, 0) - bounds.minZ) / bounds.depth));
  const horizontal = xRatio < 1 / 3 ? 'left' : xRatio >= 2 / 3 ? 'right' : 'center';
  const vertical = zRatio < 1 / 3 ? 'back' : zRatio >= 2 / 3 ? 'front' : 'middle';
  if (vertical === 'middle') return horizontal as 'left' | 'center' | 'right';
  if (horizontal === 'center') return vertical;
  return `${vertical}-${horizontal}` as SpatialZoneId;
}

function itemRadius(item: SpatialItem): number {
  return Math.hypot(
    Math.max(0, finite(item.width, 0.5)) / 2,
    Math.max(0, finite(item.depth, 0.5)) / 2,
  );
}

function wallFor(
  item: SpatialItem,
  bounds: ReturnType<typeof roomBounds>,
  threshold: number,
): SpatialItem['wall'] {
  if (item.wall) return item.wall;
  const halfWidth = Math.max(0, finite(item.width, 0)) / 2;
  const halfDepth = Math.max(0, finite(item.depth, 0)) / 2;
  const distances = [
    ['back', Math.abs(item.z - bounds.minZ) - halfDepth],
    ['front', Math.abs(bounds.maxZ - item.z) - halfDepth],
    ['left', Math.abs(item.x - bounds.minX) - halfWidth],
    ['right', Math.abs(bounds.maxX - item.x) - halfWidth],
  ] as const;
  const nearest = [...distances].sort((a, b) => a[1] - b[1])[0];
  return nearest[1] <= threshold ? nearest[0] : undefined;
}

function uniqueLabels(items: SpatialItem[]): Map<string, string> {
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const item of items) {
    const name = cleanText(item.name, 'Unnamed object');
    totals.set(name, (totals.get(name) ?? 0) + 1);
  }
  const labels = new Map<string, string>();
  for (const item of items) {
    const name = cleanText(item.name, 'Unnamed object');
    const index = (seen.get(name) ?? 0) + 1;
    seen.set(name, index);
    labels.set(item.id, (totals.get(name) ?? 0) > 1 ? `${name} ${index}` : name);
  }
  return labels;
}

function landmarkScore(item: SpatialItem): number {
  const footprint = Math.max(0, finite(item.width, 0.5)) * Math.max(0, finite(item.depth, 0.5));
  const volume = footprint * Math.max(0.1, finite(item.height, 1));
  return (item.landmark ? 1_000_000 : 0) + finite(item.importance, 0) * 1_000 + volume;
}

/**
 * Builds a stable, concise text model for assistive UI. X increases left to
 * right and Z increases back to front, matching the editor's room coordinates.
 * When explicit bounds are omitted, the room is assumed to be centered at 0,0.
 */
export function buildSpatialOverview(
  room: SpatialRoom,
  sourceItems: readonly SpatialItem[],
  options: SpatialOverviewOptions = {},
): SpatialOverview {
  const bounds = roomBounds(room);
  const items = sourceItems
    .filter((item) => item && typeof item.id === 'string' && item.id.length > 0)
    .map((item) => ({
      ...item,
      name: cleanText(item.name, 'Unnamed object'),
      x: finite(item.x, 0),
      y: finite(item.y, 0),
      z: finite(item.z, 0),
    }));
  const labels = uniqueLabels(items);
  const maxItemsPerZone = Math.max(1, Math.floor(options.maxItemsPerZone ?? 6));
  const maxLandmarks = Math.max(0, Math.floor(options.maxLandmarks ?? 4));
  const maxRelationships = Math.max(0, Math.floor(options.maxRelationships ?? 8));
  const zonesById = new Map<SpatialZoneId, SpatialItem[]>(ZONE_ORDER.map((id) => [id, []]));
  for (const item of items) zonesById.get(zoneFor(item, bounds))!.push(item);

  let omittedItemCount = 0;
  const zones: SpatialZone[] = [];
  for (const id of ZONE_ORDER) {
    const zoneItems = zonesById.get(id)!
      .sort((a, b) => (labels.get(a.id) ?? '').localeCompare(labels.get(b.id) ?? ''));
    if (!zoneItems.length && !options.includeEmptyZones) continue;
    const visible = zoneItems.slice(0, maxItemsPerZone);
    const omitted = zoneItems.length - visible.length;
    omittedItemCount += omitted;
    const names = visible.map((item) => labels.get(item.id)!);
    const contents = names.length ? names.join(', ') : 'empty';
    zones.push({
      id,
      label: ZONE_LABELS[id],
      itemIds: visible.map((item) => item.id),
      text: `${ZONE_LABELS[id]}: ${contents}${omitted ? `, plus ${plural(omitted, 'other object')}` : ''}.`,
    });
  }

  const landmarks = [...items]
    .sort((a, b) => landmarkScore(b) - landmarkScore(a) || a.name.localeCompare(b.name))
    .slice(0, maxLandmarks)
    .map((item): SpatialLandmark => {
      const zone = zoneFor(item, bounds);
      const name = labels.get(item.id)!;
      return { itemId: item.id, name, zone, text: `${name} at the ${ZONE_LABELS[zone]}` };
    });

  const byId = new Map(items.map((item) => [item.id, item]));
  const relationships: SpatialRelationship[] = [];
  const relatedPairs = new Set<string>();
  for (const item of items) {
    if (!item.supportId || relationships.length >= maxRelationships) continue;
    const support = byId.get(item.supportId);
    if (!support) continue;
    relationships.push({
      type: 'supported-by',
      subjectId: item.id,
      objectId: support.id,
      text: `${labels.get(item.id)} is on ${labels.get(support.id)}.`,
    });
    relatedPairs.add([item.id, support.id].sort().join('\u0000'));
  }

  const wallThreshold = Math.max(0, options.wallDistance ?? Math.min(bounds.width, bounds.depth) * 0.035);
  for (const item of items) {
    if (relationships.length >= maxRelationships) break;
    const wall = wallFor(item, bounds, wallThreshold);
    if (!wall) continue;
    relationships.push({
      type: 'against-wall',
      subjectId: item.id,
      wall,
      text: `${labels.get(item.id)} is against the ${wall} wall.`,
    });
  }

  const nearThreshold = Math.max(0, options.nearDistance ?? Math.min(bounds.width, bounds.depth) * 0.12);
  const nearCandidates: Array<{ a: SpatialItem; b: SpatialItem; gap: number }> = [];
  for (let aIndex = 0; aIndex < items.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < items.length; bIndex += 1) {
      const a = items[aIndex];
      const b = items[bIndex];
      const key = [a.id, b.id].sort().join('\u0000');
      if (relatedPairs.has(key)) continue;
      const gap = Math.hypot(a.x - b.x, a.z - b.z) - itemRadius(a) - itemRadius(b);
      if (gap <= nearThreshold) nearCandidates.push({ a, b, gap });
    }
  }
  nearCandidates.sort((a, b) => a.gap - b.gap || a.a.name.localeCompare(b.a.name));
  const nearMentioned = new Set<string>();
  for (const candidate of nearCandidates) {
    if (relationships.length >= maxRelationships) break;
    if (nearMentioned.has(candidate.a.id) || nearMentioned.has(candidate.b.id)) continue;
    relationships.push({
      type: 'near',
      subjectId: candidate.a.id,
      objectId: candidate.b.id,
      text: `${labels.get(candidate.a.id)} is near ${labels.get(candidate.b.id)}.`,
    });
    nearMentioned.add(candidate.a.id);
    nearMentioned.add(candidate.b.id);
  }

  const roomName = cleanText(room.name, 'Room');
  const summary = `${roomName} is ${bounds.width.toFixed(1)} by ${bounds.depth.toFixed(1)} units with ${plural(items.length, 'object')}.`;
  const sections = [summary];
  if (landmarks.length) sections.push(`Landmarks: ${landmarks.map((entry) => entry.text).join('; ')}.`);
  if (zones.length) sections.push(`Areas: ${zones.map((zone) => zone.text).join(' ')}`);
  if (relationships.length) sections.push(`Relationships: ${relationships.map((entry) => entry.text).join(' ')}`);
  if (omittedItemCount) sections.push(`${plural(omittedItemCount, 'additional object')} omitted from the concise overview.`);

  return {
    summary,
    zones,
    landmarks,
    relationships,
    omittedItemCount,
    text: sections.join(' '),
  };
}
