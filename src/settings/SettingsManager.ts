export const SETTINGS_VERSION = 1;

export type GameSettings = {
  uiScale: number;
  textScale: number;
  highContrast: boolean;
  reducedMotion: boolean;
  particles: boolean;
  masterVolume: number;
  musicVolume: number;
  worldVolume: number;
  uiVolume: number;
  simplifiedControls: boolean;
  showLabels: boolean;
  readAloud: boolean;
};

export type SystemPreferenceHints = {
  reducedMotion?: boolean;
  highContrast?: boolean;
};

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SettingsPersistenceState =
  | 'ready'
  | 'memory-only'
  | 'storage-error';

export type SettingsDiagnostics = {
  version: number;
  revision: number;
  updatedAt: number;
  loadedFrom: 'defaults' | 'storage' | 'legacy' | 'recovered';
  persistence: SettingsPersistenceState;
  lastError: string | null;
};

export type AppliedSettings = {
  uiScale: number;
  textScale: number;
  motionScale: 0 | 1;
  particlesEnabled: boolean;
  classFlags: {
    highContrast: boolean;
    reducedMotion: boolean;
    simplifiedControls: boolean;
    showLabels: boolean;
    readAloud: boolean;
  };
  audio: {
    master: number;
    music: number;
    world: number;
    ui: number;
  };
};

export type SettingsManagerOptions = {
  storage?: SettingsStorage | null;
  storageKey?: string;
  systemPreferences?: SystemPreferenceHints;
  now?: () => number;
};

type StoredSettingsEnvelope = {
  version: number;
  revision: number;
  updatedAt: number;
  settings: GameSettings;
};

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = Object.freeze({
  uiScale: 1,
  textScale: 1,
  highContrast: false,
  reducedMotion: false,
  particles: true,
  masterVolume: 0.82,
  musicVolume: 0.58,
  worldVolume: 0.8,
  uiVolume: 0.78,
  simplifiedControls: false,
  showLabels: true,
  readAloud: false,
});

const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;

const boolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export function createDefaultGameSettings(
  hints: SystemPreferenceHints = {},
): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    highContrast: hints.highContrast ?? DEFAULT_GAME_SETTINGS.highContrast,
    reducedMotion: hints.reducedMotion ?? DEFAULT_GAME_SETTINGS.reducedMotion,
    particles: hints.reducedMotion ? false : DEFAULT_GAME_SETTINGS.particles,
  };
}

export function normalizeGameSettings(
  candidate: Partial<GameSettings> | null | undefined,
  defaults: GameSettings = createDefaultGameSettings(),
): GameSettings {
  return {
    uiScale: clamp(candidate?.uiScale, 0.85, 1.35, defaults.uiScale),
    textScale: clamp(candidate?.textScale, 0.9, 1.6, defaults.textScale),
    highContrast: boolean(candidate?.highContrast, defaults.highContrast),
    reducedMotion: boolean(candidate?.reducedMotion, defaults.reducedMotion),
    particles: boolean(candidate?.particles, defaults.particles),
    masterVolume: clamp(candidate?.masterVolume, 0, 1, defaults.masterVolume),
    musicVolume: clamp(candidate?.musicVolume, 0, 1, defaults.musicVolume),
    worldVolume: clamp(candidate?.worldVolume, 0, 1, defaults.worldVolume),
    uiVolume: clamp(candidate?.uiVolume, 0, 1, defaults.uiVolume),
    simplifiedControls: boolean(
      candidate?.simplifiedControls,
      defaults.simplifiedControls,
    ),
    showLabels: boolean(candidate?.showLabels, defaults.showLabels),
    readAloud: boolean(candidate?.readAloud, defaults.readAloud),
  };
}

export function getAppliedSettings(settings: GameSettings): AppliedSettings {
  return {
    uiScale: settings.uiScale,
    textScale: settings.textScale,
    motionScale: settings.reducedMotion ? 0 : 1,
    particlesEnabled: settings.particles && !settings.reducedMotion,
    classFlags: {
      highContrast: settings.highContrast,
      reducedMotion: settings.reducedMotion,
      simplifiedControls: settings.simplifiedControls,
      showLabels: settings.showLabels,
      readAloud: settings.readAloud,
    },
    audio: {
      master: settings.masterVolume,
      music: settings.musicVolume,
      world: settings.worldVolume,
      ui: settings.uiVolume,
    },
  };
}

export function getBrowserSettingsStorage(): SettingsStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class SettingsManager {
  private readonly storage: SettingsStorage | null;
  private readonly storageKey: string;
  private readonly defaults: GameSettings;
  private readonly now: () => number;
  private readonly listeners = new Set<
    (settings: Readonly<GameSettings>, diagnostics: SettingsDiagnostics) => void
  >();

  private current: GameSettings;
  private diagnostics: SettingsDiagnostics;

  constructor(options: SettingsManagerOptions = {}) {
    this.storage =
      options.storage === undefined ? getBrowserSettingsStorage() : options.storage;
    this.storageKey = options.storageKey ?? 'my-little-room-settings-v2';
    this.defaults = createDefaultGameSettings(options.systemPreferences);
    this.now = options.now ?? (() => Date.now());
    const loaded = this.load();
    this.current = loaded.settings;
    this.diagnostics = loaded.diagnostics;
  }

  get value(): Readonly<GameSettings> {
    return { ...this.current };
  }

  get applied(): AppliedSettings {
    return getAppliedSettings(this.current);
  }

  getDiagnostics(): SettingsDiagnostics {
    return { ...this.diagnostics };
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.patch({ [key]: value } as Pick<GameSettings, K>);
  }

  patch(patch: Partial<GameSettings>): void {
    const next = normalizeGameSettings({ ...this.current, ...patch }, this.defaults);
    if (this.equal(this.current, next)) return;
    this.current = next;
    this.diagnostics.revision += 1;
    this.diagnostics.updatedAt = this.now();
    this.persist();
    this.notify();
  }

  reset(): void {
    this.current = { ...this.defaults };
    this.diagnostics.revision += 1;
    this.diagnostics.updatedAt = this.now();
    this.persist();
    this.notify();
  }

  import(serialized: string): boolean {
    try {
      const parsed = JSON.parse(serialized) as
        | Partial<GameSettings>
        | Partial<StoredSettingsEnvelope>;
      const candidate =
        parsed && typeof parsed === 'object' && 'settings' in parsed
          ? parsed.settings
          : parsed;
      if (!candidate || typeof candidate !== 'object') return false;
      this.patch(candidate as Partial<GameSettings>);
      return true;
    } catch (error) {
      this.diagnostics.lastError = this.errorMessage(error);
      this.notify();
      return false;
    }
  }

  export(): string {
    return JSON.stringify(this.envelope(), null, 2);
  }

  subscribe(
    listener: (
      settings: Readonly<GameSettings>,
      diagnostics: SettingsDiagnostics,
    ) => void,
  ): () => void {
    this.listeners.add(listener);
    listener(this.value, this.getDiagnostics());
    return () => this.listeners.delete(listener);
  }

  clearPersisted(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(this.storageKey);
      this.diagnostics.persistence = 'ready';
      this.diagnostics.lastError = null;
    } catch (error) {
      this.markStorageError(error);
    }
    this.notify();
  }

  private load(): {
    settings: GameSettings;
    diagnostics: SettingsDiagnostics;
  } {
    const updatedAt = this.now();
    const base: SettingsDiagnostics = {
      version: SETTINGS_VERSION,
      revision: 0,
      updatedAt,
      loadedFrom: 'defaults',
      persistence: this.storage ? 'ready' : 'memory-only',
      lastError: null,
    };
    if (!this.storage) return { settings: { ...this.defaults }, diagnostics: base };
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return { settings: { ...this.defaults }, diagnostics: base };
      const parsed = JSON.parse(raw) as Partial<StoredSettingsEnvelope> &
        Partial<GameSettings>;
      const envelope = parsed.settings && typeof parsed.settings === 'object';
      const settings = normalizeGameSettings(
        envelope ? parsed.settings : parsed,
        this.defaults,
      );
      return {
        settings,
        diagnostics: {
          ...base,
          revision: envelope ? Math.max(0, parsed.revision ?? 0) : 0,
          updatedAt: envelope ? Math.max(0, parsed.updatedAt ?? updatedAt) : updatedAt,
          loadedFrom: envelope ? 'storage' : 'legacy',
        },
      };
    } catch (error) {
      return {
        settings: { ...this.defaults },
        diagnostics: {
          ...base,
          loadedFrom: 'recovered',
          persistence: 'storage-error',
          lastError: this.errorMessage(error),
        },
      };
    }
  }

  private persist(): void {
    if (!this.storage) {
      this.diagnostics.persistence = 'memory-only';
      return;
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.envelope()));
      this.diagnostics.persistence = 'ready';
      this.diagnostics.lastError = null;
    } catch (error) {
      this.markStorageError(error);
    }
  }

  private envelope(): StoredSettingsEnvelope {
    return {
      version: SETTINGS_VERSION,
      revision: this.diagnostics.revision,
      updatedAt: this.diagnostics.updatedAt,
      settings: { ...this.current },
    };
  }

  private markStorageError(error: unknown): void {
    this.diagnostics.persistence = 'storage-error';
    this.diagnostics.lastError = this.errorMessage(error);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private notify(): void {
    for (const listener of this.listeners)
      listener(this.value, this.getDiagnostics());
  }

  private equal(left: GameSettings, right: GameSettings): boolean {
    return (Object.keys(left) as (keyof GameSettings)[]).every(
      (key) => left[key] === right[key],
    );
  }
}
