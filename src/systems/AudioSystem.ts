import {
  AUDIO_MANIFEST,
  AudioBusName,
  AudioCueDefinition,
  AudioCueId,
} from '../data/audioManifest';

type AudioSettings = {
  muted: boolean;
  master: number;
  ui: number;
  world: number;
  ambience: number;
};

export type AudioPlayOptions = {
  volume?: number;
  playbackRate?: number;
  position?: readonly [x: number, y: number, z: number];
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  bypassCooldown?: boolean;
  maxStartDelayMs?: number;
};

export type AudioDiagnostics = {
  supported: boolean;
  contextCreations: number;
  contextState: AudioContextState | 'unavailable' | 'not-created' | 'closed';
  unlocked: boolean;
  muted: boolean;
  volumes: AudioSettings;
  loadedCues: string[];
  failedCues: string[];
  activeSources: number;
  ambienceCue: string | null;
  playCounts: Record<string, number>;
  lastVariant: Record<string, number>;
  lastError: string | null;
};

type AudioSystemOptions = {
  manifest?: readonly AudioCueDefinition[];
  storageKey?: string;
  publishDiagnostics?: boolean;
};

type ActiveSound = {
  cueId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  nodes: AudioNode[];
  stopped: boolean;
};

const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  master: 0.82,
  ui: 0.78,
  world: 0.8,
  ambience: 0.58,
};

const clampVolume = (value: number) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));

export class AudioSystem {
  private readonly manifest: readonly AudioCueDefinition[];
  private readonly cues = new Map<string, AudioCueDefinition>();
  private readonly storageKey: string;
  private readonly shouldPublishDiagnostics: boolean;
  private readonly buffers = new Map<string, AudioBuffer[]>();
  private readonly loading = new Map<string, Promise<boolean>>();
  private readonly failedCues = new Set<string>();
  private readonly buses = new Map<AudioBusName, GainNode>();
  private readonly activeSounds = new Set<ActiveSound>();
  private readonly lastPlayedAt = new Map<string, number>();
  private readonly lastVariant = new Map<string, number>();
  private readonly playCounts = new Map<string, number>();
  private readonly diagnosticListeners = new Set<
    (diagnostics: AudioDiagnostics) => void
  >();
  private readonly abortController = new AbortController();

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private settings: AudioSettings;
  private unlocked = false;
  private disposed = false;
  private manuallyPaused = false;
  private resumeAfterVisibility = false;
  private contextCreations = 0;
  private ambience: ActiveSound | null = null;
  private ambienceGeneration = 0;
  private lastError: string | null = null;

  constructor(options: AudioSystemOptions = {}) {
    this.manifest = options.manifest ?? AUDIO_MANIFEST;
    this.storageKey = options.storageKey ?? 'my-little-room-audio-v1';
    this.shouldPublishDiagnostics = options.publishDiagnostics ?? true;
    this.settings = this.readSettings();
    for (const cue of this.manifest) this.cues.set(cue.id, cue);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.publishDiagnostics();
  }

  get isSupported(): boolean {
    return Boolean(this.audioContextConstructor());
  }

  async unlock(preload = true): Promise<boolean> {
    if (this.disposed) return false;
    const context = this.ensureContext();
    if (!context) return false;
    try {
      if (context.state !== 'running') await context.resume();
      this.unlocked = context.state === 'running';
      this.manuallyPaused = false;
      this.lastError = null;
      this.applySettings(false);
      this.publishDiagnostics();
      if (preload) void this.loadManifest();
      return this.unlocked;
    } catch (error) {
      this.recordError('Audio could not be unlocked.', error);
      return false;
    }
  }

  async loadManifest(cueIds?: readonly (AudioCueId | string)[]): Promise<void> {
    if (this.disposed) return;
    const ids = cueIds ?? this.manifest.map((cue) => cue.id);
    await Promise.all(ids.map((id) => this.loadCue(id)));
    this.publishDiagnostics();
  }

  async play(
    cueId: AudioCueId | string,
    options: AudioPlayOptions = {},
  ): Promise<boolean> {
    const sound = await this.startCue(cueId, options);
    return Boolean(sound);
  }

  async startAmbience(
    cueId: AudioCueId | string = 'ambience.room',
    fadeMs = 500,
  ): Promise<boolean> {
    if (this.ambience?.cueId === cueId && !this.ambience.stopped) return true;
    const request = ++this.ambienceGeneration;
    this.stopCurrentAmbience(fadeMs);
    const sound = await this.startCue(
      cueId,
      { bypassCooldown: true, maxStartDelayMs: Number.POSITIVE_INFINITY },
      fadeMs,
    );
    if (!sound) return false;
    if (request !== this.ambienceGeneration) {
      this.stopSound(sound, fadeMs);
      return false;
    }
    this.ambience = sound;
    this.publishDiagnostics();
    return true;
  }

  stopAmbience(fadeMs = 250): void {
    this.ambienceGeneration += 1;
    this.stopCurrentAmbience(fadeMs);
  }

  private stopCurrentAmbience(fadeMs: number): void {
    const ambience = this.ambience;
    if (!ambience) return;
    this.ambience = null;
    this.stopSound(ambience, fadeMs);
    this.publishDiagnostics();
  }

  async pause(): Promise<void> {
    this.manuallyPaused = true;
    if (this.context?.state === 'running') await this.context.suspend();
    this.publishDiagnostics();
  }

  async resume(): Promise<boolean> {
    if (this.disposed || !this.context || !this.unlocked) return false;
    this.manuallyPaused = false;
    try {
      if (this.context.state !== 'running') await this.context.resume();
      this.publishDiagnostics();
      return this.context.state === 'running';
    } catch (error) {
      this.recordError('Audio could not be resumed.', error);
      return false;
    }
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applySettings();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  setMasterVolume(volume: number): void {
    this.settings.master = clampVolume(volume);
    this.applySettings();
  }

  setBusVolume(bus: AudioBusName, volume: number): void {
    this.settings[bus] = clampVolume(volume);
    this.applySettings();
  }

  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  setListenerPose(
    position: readonly [number, number, number],
    forward: readonly [number, number, number],
    up: readonly [number, number, number] = [0, 1, 0],
  ): void {
    if (!this.context) return;
    const listener = this.context.listener;
    if (listener.positionX) {
      listener.positionX.value = position[0];
      listener.positionY.value = position[1];
      listener.positionZ.value = position[2];
      listener.forwardX.value = forward[0];
      listener.forwardY.value = forward[1];
      listener.forwardZ.value = forward[2];
      listener.upX.value = up[0];
      listener.upY.value = up[1];
      listener.upZ.value = up[2];
    } else {
      const legacy = listener as AudioListener & {
        setPosition(x: number, y: number, z: number): void;
        setOrientation(
          x: number,
          y: number,
          z: number,
          upX: number,
          upY: number,
          upZ: number,
        ): void;
      };
      legacy.setPosition(...position);
      legacy.setOrientation(...forward, ...up);
    }
  }

  getDiagnostics(): AudioDiagnostics {
    return {
      supported: this.isSupported,
      contextCreations: this.contextCreations,
      contextState: this.disposed
        ? 'closed'
        : (this.context?.state ?? 'not-created'),
      unlocked: this.unlocked,
      muted: this.settings.muted,
      volumes: { ...this.settings },
      loadedCues: [...this.buffers.keys()].sort(),
      failedCues: [...this.failedCues].sort(),
      activeSources: this.activeSounds.size,
      ambienceCue: this.ambience?.cueId ?? null,
      playCounts: Object.fromEntries(this.playCounts),
      lastVariant: Object.fromEntries(this.lastVariant),
      lastError: this.lastError,
    };
  }

  onDiagnostics(
    listener: (diagnostics: AudioDiagnostics) => void,
  ): () => void {
    this.diagnosticListeners.add(listener);
    listener(this.getDiagnostics());
    return () => this.diagnosticListeners.delete(listener);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.abortController.abort();
    this.stopAmbience(0);
    for (const sound of [...this.activeSounds]) this.stopSound(sound, 0);
    this.buffers.clear();
    this.loading.clear();
    this.buses.clear();
    this.diagnosticListeners.clear();
    if (this.context && this.context.state !== 'closed') {
      await this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.masterGain = null;
    this.unlocked = false;
    this.publishDiagnostics();
  }

  private audioContextConstructor(): typeof AudioContext | undefined {
    return (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    );
  }

  private ensureContext(): AudioContext | null {
    if (this.context || this.disposed) return this.context;
    const AudioContextClass = this.audioContextConstructor();
    if (!AudioContextClass) {
      this.lastError = 'Web Audio is unavailable in this browser.';
      this.publishDiagnostics();
      return null;
    }
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    const master = context.createGain();
    master.connect(context.destination);
    this.context = context;
    this.masterGain = master;
    this.contextCreations += 1;
    for (const busName of ['ui', 'world', 'ambience'] as const) {
      const bus = context.createGain();
      bus.connect(master);
      this.buses.set(busName, bus);
    }
    this.applySettings(false);
    this.publishDiagnostics();
    return context;
  }

  private async loadCue(cueId: AudioCueId | string): Promise<boolean> {
    if (this.buffers.has(cueId)) return true;
    const existing = this.loading.get(cueId);
    if (existing) return existing;
    const cue = this.cues.get(cueId);
    const context = this.ensureContext();
    if (!cue || !context || this.disposed) {
      if (!cue) this.failedCues.add(cueId);
      this.publishDiagnostics();
      return false;
    }
    const task = Promise.all(
      cue.urls.map(async (url) => {
        const response = await fetch(url, {
          signal: this.abortController.signal,
          cache: 'force-cache',
        });
        if (!response.ok)
          throw new Error(`Audio request failed (${response.status}): ${url}`);
        return context.decodeAudioData(await response.arrayBuffer());
      }),
    )
      .then((decoded) => {
        if (this.disposed) return false;
        this.buffers.set(cueId, decoded);
        this.failedCues.delete(cueId);
        this.lastError = null;
        return true;
      })
      .catch((error: unknown) => {
        if (!this.disposed && !(error instanceof DOMException && error.name === 'AbortError')) {
          this.failedCues.add(cueId);
          this.recordError(`Could not load audio cue “${cueId}”.`, error);
        }
        return false;
      })
      .finally(() => {
        this.loading.delete(cueId);
        this.publishDiagnostics();
      });
    this.loading.set(cueId, task);
    return task;
  }

  private async startCue(
    cueId: AudioCueId | string,
    options: AudioPlayOptions,
    fadeInMs = 0,
  ): Promise<ActiveSound | null> {
    const requestedAt = performance.now();
    if (
      this.disposed ||
      !this.unlocked ||
      !this.context ||
      this.context.state !== 'running' ||
      document.hidden
    )
      return null;
    const cue = this.cues.get(cueId);
    if (!cue) {
      this.failedCues.add(cueId);
      this.lastError = `Unknown audio cue “${cueId}”.`;
      this.publishDiagnostics();
      return null;
    }
    const now = performance.now();
    if (
      !options.bypassCooldown &&
      now - (this.lastPlayedAt.get(cueId) ?? Number.NEGATIVE_INFINITY) <
        cue.cooldownMs
    )
      return null;
    if (!(await this.loadCue(cueId)) || !this.context || this.disposed) return null;
    const maxDelay = options.maxStartDelayMs ?? (cue.loop ? Infinity : 350);
    if (performance.now() - requestedAt > maxDelay) return null;
    const buffers = this.buffers.get(cueId);
    const bus = this.buses.get(cue.bus);
    if (!buffers?.length || !bus || this.context.state !== 'running') return null;

    const variant = this.chooseVariant(cueId, buffers.length);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const nodes: AudioNode[] = [source, gain];
    source.buffer = buffers[variant];
    source.loop = Boolean(cue.loop);
    source.playbackRate.value = Math.max(0.25, Math.min(4, options.playbackRate ?? 1));
    const targetGain = cue.volume * clampVolume(options.volume ?? 1);
    const startTime = this.context.currentTime;
    gain.gain.setValueAtTime(fadeInMs ? 0.0001 : targetGain, startTime);
    if (fadeInMs)
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, targetGain),
        startTime + fadeInMs / 1000,
      );

    source.connect(gain);
    if (options.position && cue.bus === 'world') {
      const panner = this.context.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = options.refDistance ?? 2.5;
      panner.maxDistance = options.maxDistance ?? 24;
      panner.rolloffFactor = options.rolloffFactor ?? 0.8;
      if (panner.positionX) {
        panner.positionX.value = options.position[0];
        panner.positionY.value = options.position[1];
        panner.positionZ.value = options.position[2];
      } else {
        (
          panner as PannerNode & {
            setPosition(x: number, y: number, z: number): void;
          }
        ).setPosition(...options.position);
      }
      gain.connect(panner).connect(bus);
      nodes.push(panner);
    } else gain.connect(bus);

    const sound: ActiveSound = {
      cueId,
      source,
      gain,
      nodes,
      stopped: false,
    };
    source.onended = () => this.releaseSound(sound);
    this.activeSounds.add(sound);
    this.lastPlayedAt.set(cueId, performance.now());
    this.playCounts.set(cueId, (this.playCounts.get(cueId) ?? 0) + 1);
    source.start();
    this.publishDiagnostics();
    return sound;
  }

  private chooseVariant(cueId: string, count: number): number {
    if (count <= 1) {
      this.lastVariant.set(cueId, 0);
      return 0;
    }
    const previous = this.lastVariant.get(cueId) ?? -1;
    let next = Math.floor(Math.random() * count);
    if (next === previous) next = (next + 1) % count;
    this.lastVariant.set(cueId, next);
    return next;
  }

  private stopSound(sound: ActiveSound, fadeMs: number): void {
    if (sound.stopped || !this.context) return;
    sound.stopped = true;
    const now = this.context.currentTime;
    const stopAt = now + Math.max(0, fadeMs) / 1000;
    sound.gain.gain.cancelScheduledValues(now);
    sound.gain.gain.setValueAtTime(Math.max(0.0001, sound.gain.gain.value), now);
    if (fadeMs)
      sound.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    try {
      sound.source.stop(stopAt);
      if (!fadeMs) this.releaseSound(sound);
    } catch {
      this.releaseSound(sound);
    }
  }

  private releaseSound(sound: ActiveSound): void {
    if (!this.activeSounds.delete(sound)) return;
    sound.stopped = true;
    sound.source.onended = null;
    for (const node of sound.nodes) node.disconnect();
    if (this.ambience === sound) this.ambience = null;
    this.publishDiagnostics();
  }

  private applySettings(persist = true): void {
    if (this.context && this.masterGain) {
      const now = this.context.currentTime;
      this.setGain(
        this.masterGain,
        this.settings.muted ? 0 : this.settings.master,
        now,
      );
      for (const busName of ['ui', 'world', 'ambience'] as const) {
        const bus = this.buses.get(busName);
        if (bus) this.setGain(bus, this.settings[busName], now);
      }
    }
    if (persist) this.writeSettings();
    this.publishDiagnostics();
  }

  private setGain(node: GainNode, value: number, now: number): void {
    node.gain.cancelScheduledValues(now);
    node.gain.setTargetAtTime(Math.max(0, value), now, 0.015);
  }

  private readSettings(): AudioSettings {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null') as
        | Partial<AudioSettings>
        | null;
      if (!saved) return { ...DEFAULT_SETTINGS };
      return {
        muted: Boolean(saved.muted),
        master: clampVolume(saved.master ?? DEFAULT_SETTINGS.master),
        ui: clampVolume(saved.ui ?? DEFAULT_SETTINGS.ui),
        world: clampVolume(saved.world ?? DEFAULT_SETTINGS.world),
        ambience: clampVolume(saved.ambience ?? DEFAULT_SETTINGS.ambience),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private writeSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      this.lastError = null;
    } catch (error) {
      this.recordError('Audio preferences could not be saved.', error);
    }
  }

  private readonly onVisibilityChange = () => {
    if (!this.context || this.disposed) return;
    if (document.hidden) {
      this.resumeAfterVisibility =
        this.context.state === 'running' && !this.manuallyPaused;
      if (this.resumeAfterVisibility)
        void this.context.suspend().finally(() => this.publishDiagnostics());
    } else if (this.resumeAfterVisibility && !this.manuallyPaused) {
      this.resumeAfterVisibility = false;
      void this.context
        .resume()
        .catch((error) => this.recordError('Audio needs another gesture to resume.', error))
        .finally(() => this.publishDiagnostics());
    }
  };

  private recordError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.lastError = `${message} ${detail}`;
    console.warn(message, error);
    this.publishDiagnostics();
  }

  private publishDiagnostics(): void {
    const diagnostics = this.getDiagnostics();
    for (const listener of this.diagnosticListeners) listener(diagnostics);
    if (!this.shouldPublishDiagnostics || typeof window === 'undefined') return;
    (
      window as typeof window & {
        __MY_ROOM_AUDIO_DIAGNOSTICS__?: AudioDiagnostics;
      }
    ).__MY_ROOM_AUDIO_DIAGNOSTICS__ = diagnostics;
  }
}
