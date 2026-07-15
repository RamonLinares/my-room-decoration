import { expect, test } from '@playwright/test';
import {
  getLightingMood,
  interpolateHexColor,
  interpolateLightingMood,
  LIGHTING_MOOD_ORDER,
  LIGHTING_MOODS,
  nextLightingMood,
} from '../src/data/lightingMoods';

test('lighting moods form a coherent warm day cycle', () => {
  expect(LIGHTING_MOOD_ORDER).toEqual([
    'morning',
    'afternoon',
    'evening',
    'night',
  ]);
  expect(Object.keys(LIGHTING_MOODS)).toHaveLength(4);
  expect(getLightingMood('afternoon').keyIntensity).toBeGreaterThan(
    getLightingMood('evening').keyIntensity,
  );
  expect(getLightingMood('night').lampIntensity).toBeGreaterThan(
    getLightingMood('afternoon').lampIntensity,
  );
  expect(getLightingMood('night').exposure).toBeGreaterThanOrEqual(0.9);
  expect(getLightingMood('morning').fogNear).toBeLessThan(
    getLightingMood('morning').fogFar,
  );
  expect(nextLightingMood('night').id).toBe('morning');
});

test('lighting interpolation clamps progress and mixes every render value', () => {
  const evening = getLightingMood('evening');
  const night = getLightingMood('night');
  const halfway = interpolateLightingMood('evening', 'night', 0.5);
  expect(halfway.progress).toBe(0.5);
  expect(halfway.keyIntensity).toBe((evening.keyIntensity + night.keyIntensity) / 2);
  expect(halfway.keyPosition[1]).toBe(
    (evening.keyPosition[1] + night.keyPosition[1]) / 2,
  );
  expect(halfway.sceneBackground).toBe(
    interpolateHexColor(evening.sceneBackground, night.sceneBackground, 0.5),
  );
  expect(interpolateLightingMood('morning', 'night', -1).progress).toBe(0);
  expect(interpolateLightingMood('morning', 'night', 2).progress).toBe(1);
});
