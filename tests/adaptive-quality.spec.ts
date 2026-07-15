import { expect, test } from '@playwright/test';
import {
  AdaptiveQualityManager,
  boundedDevicePixelRatio,
  getQualityRecommendation,
  recommendInitialQuality,
} from '../src/systems/AdaptiveQualityManager';

test('initial quality and DPR recommendations are bounded by device capability', () => {
  expect(
    recommendInitialQuality({
      devicePixelRatio: 3,
      hardwareConcurrency: 2,
      deviceMemoryGb: 2,
      coarsePointer: true,
    }),
  ).toBe('low');
  expect(
    recommendInitialQuality({
      devicePixelRatio: 3,
      hardwareConcurrency: 6,
      deviceMemoryGb: 6,
      coarsePointer: true,
    }),
  ).toBe('medium');
  expect(
    recommendInitialQuality({
      devicePixelRatio: 1.5,
      hardwareConcurrency: 10,
      deviceMemoryGb: 8,
    }),
  ).toBe('high');
  expect(boundedDevicePixelRatio(3, 'low')).toBe(1);
  expect(boundedDevicePixelRatio(3, 'medium')).toBe(1.35);
  expect(boundedDevicePixelRatio(3, 'high')).toBe(1.7);
  expect(boundedDevicePixelRatio(0.5, 'high')).toBe(0.75);
  expect(getQualityRecommendation('low').shadowMapSize).toBe(512);
  expect(getQualityRecommendation('high').detailScale).toBe(1);
});

test('sustained slow frames downgrade quickly without flapping', () => {
  const changes: string[] = [];
  const manager = new AdaptiveQualityManager({
    initialTier: 'high',
    sampleWindow: 12,
    minimumSamples: 8,
    evaluationInterval: 2,
    downgradeVotes: 2,
    upgradeVotes: 4,
    cooldownMs: 1_000,
    onChange: (change) => changes.push(`${change.previous.tier}-${change.current.tier}`),
  });
  for (let index = 0; index < 12; index += 1) manager.recordFrame(29, index * 20);
  expect(manager.recommendation.tier).toBe('medium');
  expect(changes).toEqual(['high-medium']);

  for (let index = 0; index < 20; index += 1)
    manager.recordFrame(index % 2 ? 14 : 24, 300 + index * 20);
  expect(manager.recommendation.tier).toBe('medium');
  expect(changes).toHaveLength(1);
});

test('quality upgrades require longer sustained headroom and respect cooldown', () => {
  const manager = new AdaptiveQualityManager({
    initialTier: 'low',
    sampleWindow: 12,
    minimumSamples: 8,
    evaluationInterval: 2,
    downgradeVotes: 1,
    upgradeVotes: 3,
    cooldownMs: 1_000,
  });
  for (let index = 0; index < 16; index += 1) manager.recordFrame(13, index * 20);
  expect(manager.recommendation.tier).toBe('medium');

  for (let index = 0; index < 30; index += 1)
    manager.recordFrame(12, 400 + index * 20);
  expect(manager.recommendation.tier).toBe('medium');

  for (let index = 0; index < 10; index += 1)
    manager.recordFrame(12, 1_500 + index * 20);
  expect(manager.recommendation.tier).toBe('high');
  expect(manager.getDiagnostics().p90FrameMs).toBe(12);
});
