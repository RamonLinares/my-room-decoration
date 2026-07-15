import { expect, test } from '@playwright/test';
import { buildSpatialOverview, type SpatialItem } from '../src/accessibility/SpatialOverview';

const room = { name: 'Ramon’s room', width: 12, depth: 9 };

test.describe('accessible spatial overview', () => {
  test('builds concise zones, landmarks, supports, walls, and nearby relationships', () => {
    const items: SpatialItem[] = [
      {
        id: 'desk',
        name: 'Writing desk',
        x: 4.5,
        z: -3.2,
        width: 2.4,
        depth: 1.2,
        height: 1.4,
        landmark: true,
      },
      {
        id: 'lamp',
        name: 'Green lamp',
        x: 4.5,
        y: 1.4,
        z: -3.2,
        supportId: 'desk',
        width: 0.4,
        depth: 0.4,
      },
      {
        id: 'bed',
        name: 'Patchwork bed',
        x: -4,
        z: -3.2,
        width: 3,
        depth: 4,
        height: 1,
        importance: 10,
      },
      {
        id: 'chair',
        name: 'Sunday chair',
        x: 3,
        z: -2.7,
        width: 1,
        depth: 1,
      },
      {
        id: 'rug',
        name: 'Memory rug',
        x: 0,
        z: 0,
        width: 5,
        depth: 4,
      },
    ];
    const overview = buildSpatialOverview(room, items, {
      maxLandmarks: 3,
      maxRelationships: 8,
      nearDistance: 1,
    });

    expect(overview.summary).toBe('Ramon’s room is 12.0 by 9.0 units with 5 objects.');
    expect(overview.zones.find((zone) => zone.id === 'back-right')).toMatchObject({
      itemIds: ['lamp', 'chair', 'desk'],
    });
    expect(overview.landmarks[0]).toMatchObject({ itemId: 'desk', zone: 'back-right' });
    expect(overview.landmarks).toContainEqual(expect.objectContaining({ itemId: 'bed', zone: 'back-left' }));
    expect(overview.relationships).toContainEqual({
      type: 'supported-by',
      subjectId: 'lamp',
      objectId: 'desk',
      text: 'Green lamp is on Writing desk.',
    });
    expect(overview.relationships.some((entry) => entry.type === 'against-wall' && entry.subjectId === 'bed')).toBe(true);
    expect(overview.relationships.some((entry) => entry.type === 'near' && [entry.subjectId, entry.objectId].includes('chair'))).toBe(true);
    expect(overview.text).toContain('Landmarks:');
    expect(overview.text).toContain('Relationships:');
  });

  test('disambiguates duplicate names and caps verbose zones deterministically', () => {
    const items: SpatialItem[] = Array.from({ length: 5 }, (_, index) => ({
      id: `book-${index}`,
      name: index === 4 ? 'Book\u0000 stack' : 'Book stack',
      x: 0,
      z: 0,
    }));
    const overview = buildSpatialOverview(room, items, {
      maxItemsPerZone: 2,
      maxLandmarks: 0,
      maxRelationships: 0,
    });
    const center = overview.zones.find((zone) => zone.id === 'center')!;

    expect(center.text).toBe('center: Book stack 1, Book stack 2, plus 3 other objects.');
    expect(overview.omittedItemCount).toBe(3);
    expect(overview.text).not.toContain('\u0000');
    expect(overview.text).toContain('3 additional objects omitted');
  });

  test('supports explicit room bounds and optional empty-zone descriptions', () => {
    const overview = buildSpatialOverview(
      { name: 'L-shaped room', width: 12, depth: 10, minX: 10, maxX: 22, minZ: 30, maxZ: 40 },
      [{ id: 'plant', name: 'Plant', x: 21, z: 39 }],
      { includeEmptyZones: true, maxRelationships: 0 },
    );
    expect(overview.zones).toHaveLength(9);
    expect(overview.zones.find((zone) => zone.id === 'front-right')?.itemIds).toEqual(['plant']);
    expect(overview.zones.find((zone) => zone.id === 'back-left')?.text).toBe('back left: empty.');
  });
});
