export type LightingMoodId = 'morning' | 'afternoon' | 'evening' | 'night';

export type Vec3Tuple = readonly [x: number, y: number, z: number];

export type LightingMood = {
  id: LightingMoodId;
  label: string;
  sceneBackground: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  hemisphereSky: number;
  hemisphereGround: number;
  hemisphereIntensity: number;
  keyColor: number;
  keyIntensity: number;
  keyPosition: Vec3Tuple;
  fillColor: number;
  fillIntensity: number;
  lampColor: number;
  lampIntensity: number;
  exposure: number;
  dustColor: number;
  dustOpacity: number;
  ambienceGain: number;
  transitionMs: number;
};

export type LightingMoodSnapshot = Omit<LightingMood, 'id' | 'label'> & {
  from: LightingMoodId;
  to: LightingMoodId;
  progress: number;
};

export const LIGHTING_MOOD_ORDER: readonly LightingMoodId[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
];

export const LIGHTING_MOODS: Readonly<Record<LightingMoodId, LightingMood>> = {
  morning: Object.freeze({
    id: 'morning',
    label: 'Morning',
    sceneBackground: 0xa9b5b4,
    fogColor: 0xb8b4aa,
    fogNear: 24,
    fogFar: 46,
    hemisphereSky: 0xd7e7e4,
    hemisphereGround: 0x6d5040,
    hemisphereIntensity: 1.18,
    keyColor: 0xffd9a6,
    keyIntensity: 58,
    keyPosition: [-6.5, 9.5, 4.5] as const,
    fillColor: 0xb9dce6,
    fillIntensity: 0.72,
    lampColor: 0xffad68,
    lampIntensity: 1.8,
    exposure: 1.02,
    dustColor: 0xffe8bb,
    dustOpacity: 0.42,
    ambienceGain: 0.46,
    transitionMs: 520,
  }),
  afternoon: Object.freeze({
    id: 'afternoon',
    label: 'Afternoon',
    sceneBackground: 0x848a95,
    fogColor: 0x99969a,
    fogNear: 24,
    fogFar: 46,
    hemisphereSky: 0xc9dddf,
    hemisphereGround: 0x5b382b,
    hemisphereIntensity: 1.12,
    keyColor: 0xffd69b,
    keyIntensity: 62,
    keyPosition: [-6.5, 10, 7.5] as const,
    fillColor: 0xaed7e6,
    fillIntensity: 0.76,
    lampColor: 0xffa94e,
    lampIntensity: 2.2,
    exposure: 1,
    dustColor: 0xffe2a8,
    dustOpacity: 0.5,
    ambienceGain: 0.5,
    transitionMs: 520,
  }),
  evening: Object.freeze({
    id: 'evening',
    label: 'Evening',
    sceneBackground: 0x555666,
    fogColor: 0x6b6570,
    fogNear: 21,
    fogFar: 43,
    hemisphereSky: 0x8798ae,
    hemisphereGround: 0x402b29,
    hemisphereIntensity: 0.82,
    keyColor: 0xffbf82,
    keyIntensity: 42,
    keyPosition: [-4, 8.5, 5] as const,
    fillColor: 0x809bb9,
    fillIntensity: 0.5,
    lampColor: 0xffa057,
    lampIntensity: 9,
    exposure: 0.98,
    dustColor: 0xffc98b,
    dustOpacity: 0.4,
    ambienceGain: 0.55,
    transitionMs: 620,
  }),
  night: Object.freeze({
    id: 'night',
    label: 'Night',
    sceneBackground: 0x282e3e,
    fogColor: 0x373b4b,
    fogNear: 18,
    fogFar: 39,
    hemisphereSky: 0x596b88,
    hemisphereGround: 0x281d24,
    hemisphereIntensity: 0.5,
    keyColor: 0xa8bcdf,
    keyIntensity: 17,
    keyPosition: [4.5, 8, -4] as const,
    fillColor: 0x63799e,
    fillIntensity: 0.28,
    lampColor: 0xff9851,
    lampIntensity: 14,
    exposure: 0.9,
    dustColor: 0xffbd7a,
    dustOpacity: 0.28,
    ambienceGain: 0.6,
    transitionMs: 720,
  }),
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

export function interpolateHexColor(
  from: number,
  to: number,
  progress: number,
): number {
  const t = clamp01(progress);
  const channel = (shift: number) =>
    Math.round(mix((from >> shift) & 0xff, (to >> shift) & 0xff, t));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function getLightingMood(id: LightingMoodId): LightingMood {
  return LIGHTING_MOODS[id];
}

export function nextLightingMood(id: LightingMoodId): LightingMood {
  const index = LIGHTING_MOOD_ORDER.indexOf(id);
  return LIGHTING_MOODS[
    LIGHTING_MOOD_ORDER[(index + 1) % LIGHTING_MOOD_ORDER.length]
  ];
}

export function interpolateLightingMood(
  fromId: LightingMoodId,
  toId: LightingMoodId,
  progress: number,
): LightingMoodSnapshot {
  const from = LIGHTING_MOODS[fromId];
  const to = LIGHTING_MOODS[toId];
  const t = clamp01(progress);
  const color = (key: keyof LightingMood) =>
    interpolateHexColor(from[key] as number, to[key] as number, t);
  const scalar = (key: keyof LightingMood) =>
    mix(from[key] as number, to[key] as number, t);
  const vector = (fromValue: Vec3Tuple, toValue: Vec3Tuple): Vec3Tuple => [
    mix(fromValue[0], toValue[0], t),
    mix(fromValue[1], toValue[1], t),
    mix(fromValue[2], toValue[2], t),
  ];
  return {
    from: fromId,
    to: toId,
    progress: t,
    sceneBackground: color('sceneBackground'),
    fogColor: color('fogColor'),
    fogNear: scalar('fogNear'),
    fogFar: scalar('fogFar'),
    hemisphereSky: color('hemisphereSky'),
    hemisphereGround: color('hemisphereGround'),
    hemisphereIntensity: scalar('hemisphereIntensity'),
    keyColor: color('keyColor'),
    keyIntensity: scalar('keyIntensity'),
    keyPosition: vector(from.keyPosition, to.keyPosition),
    fillColor: color('fillColor'),
    fillIntensity: scalar('fillIntensity'),
    lampColor: color('lampColor'),
    lampIntensity: scalar('lampIntensity'),
    exposure: scalar('exposure'),
    dustColor: color('dustColor'),
    dustOpacity: scalar('dustOpacity'),
    ambienceGain: scalar('ambienceGain'),
    transitionMs: scalar('transitionMs'),
  };
}
