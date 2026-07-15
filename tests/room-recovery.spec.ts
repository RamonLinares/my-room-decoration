import { expect, test } from '@playwright/test';
import {
  archiveRoomRecord,
  buildRoomCardMetadata,
  canRecoverRoom,
  createRoomThumbnailMetadata,
  restoreRoomRecord,
  sweepRoomArchives,
} from '../src/persistence/RoomRecovery';
import type { RoomRecord } from '../src/persistence/types';

function room(overrides: Partial<RoomRecord> = {}): RoomRecord {
  return {
    id: 'room-1',
    schemaVersion: 1,
    name: 'Reading room',
    createdAt: 100,
    updatedAt: 200,
    design: { items: [{ id: 'chair' }, { id: 'lamp' }] },
    ...overrides,
  };
}

test.describe('room archive and recovery helpers', () => {
  test('archives with a grace deadline, classifies expiry, and restores safely', () => {
    const archived = archiveRoomRecord(room(), { now: 1_000, graceMs: 500 });
    expect(archived).toMatchObject({ archived: true, archivedAt: 1_000, purgeAfter: 1_500, updatedAt: 1_000 });
    expect(canRecoverRoom(archived, 1_500)).toBe(true);
    expect(canRecoverRoom(archived, 1_501)).toBe(false);

    const sweep = sweepRoomArchives([
      room({ id: 'active' }),
      archived,
      archiveRoomRecord(room({ id: 'expired' }), { now: 100, graceMs: 100 }),
    ], 1_200);
    expect(sweep.active.map((entry) => entry.id)).toEqual(['active']);
    expect(sweep.recoverable.map((entry) => entry.id)).toEqual(['room-1']);
    expect(sweep.expired.map((entry) => entry.id)).toEqual(['expired']);

    const restored = restoreRoomRecord(archived, 1_300);
    expect(restored.archived).toBe(false);
    expect(restored.archivedAt).toBeUndefined();
    expect(restored.purgeAfter).toBeUndefined();
    expect(restored.updatedAt).toBe(1_300);
  });

  test('creates thumbnail and room-card metadata without retaining image bytes', () => {
    const thumbnail = new Blob(['preview'], { type: 'image/webp' });
    const thumbnailMetadata = createRoomThumbnailMetadata(thumbnail, {
      width: 640,
      height: 360,
      generatedAt: 700,
      alt: '  Warm reading room preview  ',
    });
    const archived = archiveRoomRecord(room({ thumbnail, thumbnailMetadata }), {
      now: 1_000,
      graceMs: 500,
    });
    const card = buildRoomCardMetadata(archived, {
      storyId: 'reading-corner',
      storyTitle: 'A quiet reading corner',
      templateId: 'cozy-starter',
    });

    expect(thumbnailMetadata).toEqual({
      width: 640,
      height: 360,
      mimeType: 'image/webp',
      byteSize: 7,
      generatedAt: 700,
      alt: 'Warm reading room preview',
    });
    expect(card).toMatchObject({
      id: 'room-1',
      name: 'Reading room',
      objectCount: 2,
      archived: true,
      recoverUntil: 1_500,
      storyId: 'reading-corner',
      templateId: 'cozy-starter',
      thumbnail: thumbnailMetadata,
    });
    expect('blob' in card).toBe(false);
  });
});
