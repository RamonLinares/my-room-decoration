import { expect, test } from '@playwright/test';
import {
  SHARE_PACKAGE_SCHEMA,
  SharePackageError,
  createSharePackage,
  createSharePackageDownload,
  decodeSharePackageHash,
  encodeSharePackageHash,
  inspectSharePackageBlob,
  inspectSharePackageHash,
  parseSharePackageBlob,
  parseSharePackageText,
  serializeSharePackage,
  validateSharePackage,
} from '../src/persistence/SharePackageCodec';

function samplePackage() {
  return createSharePackage({
    createdAt: '2026-07-15T08:00:00.000Z',
    room: {
      name: 'Habitación de Ramón 🌿',
      width: 14,
      depth: 11,
      shape: 'rectangle',
      shapeWidth: 0.55,
      crossbarDepth: 0.55,
      wallColor: 0xe8d7b8,
      floorColor: 0x8d6548,
      wallStyle: 'paint',
      floorStyle: 'planks',
    },
    items: [
      {
        id: 'desk-old',
        kind: 'desk',
        name: 'Writing desk',
        category: 'workspace',
        x: 3,
        z: -3,
        rot: 0,
        color: 0x123456,
        scale: 1,
      },
      {
        id: 'lamp-old',
        kind: 'lamp',
        name: 'Green lamp',
        category: 'light',
        x: 3,
        y: 1.4,
        z: -3,
        rot: 0.2,
        color: 0xabcdef,
        supportId: 'desk-old',
        interaction: {
          action: 'toggle lamp',
          isOn: true,
          intensity: 0.75,
          emptyLabel: '',
        },
      },
    ],
    preferences: { evening: true, gridSnap: false },
    story: {
      id: 'reading-corner',
      title: 'A quiet reading corner',
      status: 'active',
      stepId: 'add-a-light',
      featuredObjectId: 'lamp-old',
      progress: { placedSeat: true, visits: 2 },
    },
    metadata: {
      templateId: 'cozy-starter',
      templateName: 'Cozy starter',
      description: 'A warm room ready for reading.',
      tags: ['cozy', 'reading', 'cozy'],
      favoriteObjectId: 'desk-old',
      palette: [0x123456, 0xabcdef],
      custom: { source: 'storybook', revision: 3 },
    },
  });
}

test.describe('editable share-package codec', () => {
  test('round-trips Unicode URL hashes and remaps linked item IDs', () => {
    const source = samplePackage();
    const hash = encodeSharePackageHash(source);
    let id = 0;
    const imported = decodeSharePackageHash(`https://example.test/room${hash}`, {
      idFactory: () => `new-${++id}`,
    });

    expect(hash).toMatch(/^#room=[A-Za-z0-9_-]+$/);
    expect(imported.package.room.name).toBe('Habitación de Ramón 🌿');
    expect(imported.package.items.map((item) => item.id)).toEqual(['new-1', 'new-2']);
    expect(imported.package.items[1].supportId).toBe('new-1');
    expect(imported.package.items[1].interaction).toEqual({
      action: 'toggle lamp',
      isOn: true,
      intensity: 0.75,
      emptyLabel: '',
    });
    expect(imported.package.story?.featuredObjectId).toBe('new-2');
    expect(imported.package.metadata?.favoriteObjectId).toBe('new-1');
    expect(imported.idMap.get('desk-old')).toBe('new-1');
    expect(imported.package.schema).toBe(SHARE_PACKAGE_SCHEMA);
  });

  test('inspects links and files without remapping or creating a room', async () => {
    const source = samplePackage();
    const linkInspection = inspectSharePackageHash(encodeSharePackageHash(source));
    const fileInspection = await inspectSharePackageBlob(createSharePackageDownload(source).blob);

    for (const inspection of [linkInspection, fileInspection]) {
      expect(inspection.package.items.map((item) => item.id)).toEqual(['desk-old', 'lamp-old']);
      expect(inspection.preview).toMatchObject({
        name: 'Habitación de Ramón 🌿',
        dimensions: '14 × 11 units',
        shape: 'rectangle',
        itemCount: 2,
        supportedItemCount: 1,
        interactiveItemCount: 1,
        templateName: 'Cozy starter',
        tags: ['cozy', 'reading'],
        story: {
          id: 'reading-corner',
          title: 'A quiet reading corner',
          status: 'active',
        },
      });
      expect(inspection.preview.text).toContain('2 objects, 1 interactive');
    }
  });

  test('continues to accept and serialize original version-one packages without optional state', () => {
    const legacy = JSON.parse(serializeSharePackage(samplePackage()));
    delete legacy.story;
    delete legacy.metadata;
    for (const item of legacy.items) delete item.interaction;
    const validated = validateSharePackage(legacy);

    expect(validated.version).toBe(1);
    expect(validated.story).toBeUndefined();
    expect(validated.metadata).toBeUndefined();
    expect(validated.items.every((item) => item.interaction === undefined)).toBe(true);
    expect(JSON.parse(serializeSharePackage(validated))).toEqual(legacy);
  });

  test('parses downloadable packages and preserves editable room data', async () => {
    const source = samplePackage();
    const download = createSharePackageDownload(source);
    const imported = await parseSharePackageBlob(download.blob, { remapIds: false });

    expect(download.filename).toBe('habitacion-de-ramon-2026-07-15.myroom.json');
    expect(download.blob.type).toBe('application/vnd.my-little-room+json');
    expect(imported.package).toEqual(source);
    expect(imported.idMap.size).toBe(0);
    expect(JSON.parse(await download.blob.text())).toEqual(source);
  });

  test('strips unknown properties while validating supported data', () => {
    const source = JSON.parse(serializeSharePackage(samplePackage())) as Record<string, unknown>;
    source.untrusted = { executable: true };
    const firstItem = (source.items as Array<Record<string, unknown>>)[0];
    firstItem.untrusted = '<script>alert(1)</script>';
    const validated = validateSharePackage(source) as unknown as Record<string, unknown>;

    expect(validated.untrusted).toBeUndefined();
    expect((validated.items as Array<Record<string, unknown>>)[0].untrusted).toBeUndefined();
  });

  test('rejects oversized hashes and files before parsing', async () => {
    const source = samplePackage();
    expect(() => encodeSharePackageHash(source, { maxBytes: 10 })).toThrow(SharePackageError);
    expect(() => decodeSharePackageHash(`#room=${'a'.repeat(10_000)}`, { maxBytes: 20 })).toThrow(/limit/i);
    expect(() => parseSharePackageText(serializeSharePackage(source), { maxBytes: 10 })).toThrow(/limit/i);
    await expect(parseSharePackageBlob(new Blob(['x'.repeat(100)]), { maxBytes: 10 })).rejects.toThrow(/limit/i);
  });

  test('rejects malformed JSON, unsupported versions, duplicates, invalid supports, and non-finite values', () => {
    expect(() => parseSharePackageText('{')).toThrow(/valid JSON/i);

    const version = JSON.parse(serializeSharePackage(samplePackage()));
    version.version = 99;
    expect(() => validateSharePackage(version)).toThrow(/not supported/i);

    const duplicate = JSON.parse(serializeSharePackage(samplePackage()));
    duplicate.items[1].id = duplicate.items[0].id;
    expect(() => validateSharePackage(duplicate)).toThrow(/duplicated/i);

    const support = JSON.parse(serializeSharePackage(samplePackage()));
    support.items[1].supportId = 'missing';
    expect(() => validateSharePackage(support)).toThrow(/does not identify/i);

    const cycle = JSON.parse(serializeSharePackage(samplePackage()));
    cycle.items[0].supportId = cycle.items[1].id;
    expect(() => validateSharePackage(cycle)).toThrow(/cycle/i);

    const finish = JSON.parse(serializeSharePackage(samplePackage()));
    finish.room.wallStyle = 'javascript:alert(1)';
    expect(() => validateSharePackage(finish)).toThrow(/not supported/i);

    const reserved = JSON.parse(serializeSharePackage(samplePackage()));
    reserved.items[1].interaction = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(() => validateSharePackage(reserved)).toThrow(/reserved property/i);

    const nonFinite = JSON.parse(serializeSharePackage(samplePackage()));
    nonFinite.items[0].x = Number.POSITIVE_INFINITY;
    expect(() => validateSharePackage(nonFinite)).toThrow(/supported range/i);
  });

  test('rejects a non-unique ID factory instead of corrupting references', () => {
    expect(() => parseSharePackageText(serializeSharePackage(samplePackage()), {
      idFactory: () => 'same-id',
    })).toThrow(/unique item identifiers/i);
    expect(() => parseSharePackageText(serializeSharePackage(samplePackage()), {
      idFactory: () => 'desk-old',
    })).toThrow(/unique item identifiers/i);
  });
});
