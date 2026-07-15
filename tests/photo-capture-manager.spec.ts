import { expect, test } from '@playwright/test';
import { PhotoCaptureManager } from '../src/photo/PhotoCaptureManager';

test('capture plans preserve aspect ratio and degrade high quality to fit memory', () => {
  const ample = new PhotoCaptureManager({ memoryBudgetBytes: 160 * 1024 * 1024 });
  const high = ample.createPlan({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 2,
    quality: 'high',
  });
  expect(high.appliedQuality).toBe('high');
  expect(high.width / high.height).toBeCloseTo(1280 / 720, 2);
  expect(high.samples).toBe(4);
  expect(high.estimatedBytes.peak).toBeLessThanOrEqual(high.memoryBudgetBytes);

  const constrained = new PhotoCaptureManager({ memoryBudgetBytes: 24 * 1024 * 1024 });
  const fallback = constrained.createPlan({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 3,
    quality: 'high',
  });
  expect(fallback.degraded).toBe(true);
  expect(fallback.appliedQuality).toBe('standard');
  expect(fallback.samples).toBe(0);
  expect(fallback.fallbackReasons).toContain('memory-budget-quality');
  expect(fallback.estimatedBytes.peak).toBeLessThanOrEqual(
    fallback.memoryBudgetBytes * 1.12,
  );
});

test('context loss forces a temporary standard plan and records diagnostics', () => {
  let now = 1_000;
  const photos = new PhotoCaptureManager({ now: () => now });
  photos.recordFailure({ reason: 'context-loss', message: 'WebGL context lost' });
  const fallback = photos.createPlan({
    cssWidth: 900,
    cssHeight: 600,
    devicePixelRatio: 2,
    quality: 'high',
  });
  expect(fallback.appliedQuality).toBe('standard');
  expect(fallback.fallbackReasons).toContain('recent-context-loss');
  expect(photos.getDiagnostics()).toMatchObject({
    failedCaptures: 1,
    contextLosses: 1,
    lastFailure: 'WebGL context lost',
  });
  now += 6 * 60 * 1_000;
  expect(
    photos.createPlan({
      cssWidth: 900,
      cssHeight: 600,
      devicePixelRatio: 2,
      quality: 'high',
    }).appliedQuality,
  ).toBe('high');
});

test('storage assessment and thumbnail reuse are explicit and revision-safe', async () => {
  let now = 2_000;
  const photos = new PhotoCaptureManager({
    now: () => now,
    storageEstimate: async () => ({
      usage: 20 * 1024 * 1024,
      quota: 100 * 1024 * 1024,
    }),
  });
  const storage = await photos.assessStorage(5 * 1024 * 1024);
  expect(storage).toMatchObject({ known: true, canStore: true });
  const plan = photos.createPlan({
    cssWidth: 800,
    cssHeight: 600,
    devicePixelRatio: 1,
    quality: 'standard',
  });
  const metadata = photos.recordSuccess({
    plan,
    blobBytes: 450_000,
    roomRevision: 7,
    cameraSignature: 'camera-a',
    thumbnailWidth: 480,
    thumbnailHeight: 360,
  });
  expect(metadata.reuseKey).toBe('7::camera-a');
  expect(
    photos.getReusableThumbnail({
      roomRevision: 7,
      cameraSignature: 'camera-a',
      minimumWidth: 400,
    }),
  ).not.toBeNull();
  expect(
    photos.getReusableThumbnail({ roomRevision: 8, cameraSignature: 'camera-a' }),
  ).toBeNull();
  now += 11 * 60 * 1_000;
  expect(
    photos.getReusableThumbnail({ roomRevision: 7, cameraSignature: 'camera-a' }),
  ).toBeNull();
});
