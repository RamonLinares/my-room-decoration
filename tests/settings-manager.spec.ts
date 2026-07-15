import { expect, test } from '@playwright/test';
import {
  getAppliedSettings,
  SettingsManager,
  SettingsStorage,
} from '../src/settings/SettingsManager';

class MemoryStorage implements SettingsStorage {
  values = new Map<string, string>();
  failWrites = false;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('settings normalize, persist immediately, and reload from a versioned envelope', () => {
  const storage = new MemoryStorage();
  let now = 100;
  const settings = new SettingsManager({ storage, now: () => ++now });
  settings.patch({
    uiScale: 9,
    textScale: 0.2,
    highContrast: true,
    masterVolume: -2,
    worldVolume: 2,
    readAloud: true,
  });
  expect(settings.value).toMatchObject({
    uiScale: 1.35,
    textScale: 0.9,
    highContrast: true,
    masterVolume: 0,
    worldVolume: 1,
    readAloud: true,
  });
  expect(settings.getDiagnostics()).toMatchObject({
    persistence: 'ready',
    revision: 1,
  });

  const reloaded = new SettingsManager({ storage, now: () => 999 });
  expect(reloaded.value).toEqual(settings.value);
  expect(reloaded.getDiagnostics().loadedFrom).toBe('storage');
});

test('settings retain live state and diagnostics when durable storage fails', () => {
  const storage = new MemoryStorage();
  const settings = new SettingsManager({ storage });
  storage.failWrites = true;
  settings.set('simplifiedControls', true);
  expect(settings.value.simplifiedControls).toBe(true);
  expect(settings.getDiagnostics()).toMatchObject({
    persistence: 'storage-error',
    lastError: 'quota exceeded',
  });
});

test('accessibility preferences produce one integration-ready applied model', () => {
  const settings = new SettingsManager({
    systemPreferences: { reducedMotion: true, highContrast: true },
  });
  settings.patch({
    uiScale: 1.2,
    textScale: 1.4,
    showLabels: false,
    readAloud: true,
  });
  expect(getAppliedSettings(settings.value)).toEqual({
    uiScale: 1.2,
    textScale: 1.4,
    motionScale: 0,
    particlesEnabled: false,
    classFlags: {
      highContrast: true,
      reducedMotion: true,
      simplifiedControls: false,
      showLabels: false,
      readAloud: true,
    },
    audio: {
      master: 0.82,
      music: 0.58,
      world: 0.8,
      ui: 0.78,
    },
  });
});
