export const WALK_INTERACTION_SAVE_VERSION = 1;

export type WalkInteractionFamily =
  | "light"
  | "container"
  | "seat"
  | "music"
  | "keepsake";

export type WalkInteractionState =
  | "off"
  | "on"
  | "closed"
  | "open"
  | "idle"
  | "seated"
  | "stopped"
  | "playing"
  | "unseen"
  | "inspected";

export type WalkObjectRef = {
  id: string;
  kind: string;
  name?: string;
};

export type WalkInteractionPrompt = {
  objectId: string;
  family: WalkInteractionFamily;
  actionLabel: string;
  state: WalkInteractionState;
  cooldownRemainingMs: number;
  available: boolean;
};

export type WalkInteractionChange = {
  objectId: string;
  kind: string;
  family: WalkInteractionFamily;
  previous: WalkInteractionState;
  state: WalkInteractionState;
};

export type WalkInteractionResult =
  | {
      status: "applied";
      prompt: WalkInteractionPrompt;
      changes: WalkInteractionChange[];
      announcement: string;
    }
  | {
      status: "cooldown";
      prompt: WalkInteractionPrompt;
      changes: [];
      announcement: string;
    }
  | {
      status: "unsupported";
      changes: [];
      announcement: string;
    };

export type WalkInteractionSave = {
  version: number;
  objects: Record<
    string,
    {
      kind: string;
      state: WalkInteractionState;
      lastInteractedAt: number;
    }
  >;
  activeSeatId?: string;
  activeMusicId?: string;
};

export type WalkInteractionOptions = {
  cooldownMs?: number;
  now?: () => number;
  initialState?: unknown;
  onChange?: (changes: readonly WalkInteractionChange[]) => void;
};

type Definition = {
  family: WalkInteractionFamily;
  initial: WalkInteractionState;
  next: (state: WalkInteractionState) => WalkInteractionState;
  label: (state: WalkInteractionState) => string;
};

const toggle = (a: WalkInteractionState, b: WalkInteractionState) =>
  (state: WalkInteractionState) => (state === b ? a : b);

const LIGHT_KINDS = [
  "lamp",
  "bankerslamp",
  "readinglamp",
  "mushroomlamp",
  "nightlight",
  "oillamp",
  "lantern",
  "fairy",
  "candles",
  "lavalamp",
  "fireflyjar",
  "fireplace",
  "scallopsconce",
  "beadedchandelier",
  "rr-task-lamp",
  "rr-ceiling-light",
  "rr-softbox",
] as const;

const CONTAINER_KINDS = [
  "wardrobe",
  "paxdrawers",
  "dresser",
  "nightstand",
  "filing",
  "toybox",
  "cornercabinet",
  "rr-built-in-wardrobe",
  "rr-glass-cabinets",
  "rr-dresser",
  "rr-rolling-drawers",
] as const;

const SEAT_KINDS = [
  "chair",
  "deskchair",
  "armchair",
  "sofa",
  "sectional",
  "ottoman",
  "rockingchair",
  "windowbench",
  "spindlestool",
  "chaise",
  "bed",
  "daybed",
  "floorbed",
  "rr-armchair",
  "rr-ergonomic-chair",
] as const;

const MUSIC_KINDS = [
  "radio",
  "record",
  "musicbox",
  "storybookbox",
  "hifistack",
  "speakers",
  "floorspeakers",
] as const;

const KEEPSAKE_KINDS = [
  "teddy",
  "camera",
  "snowglobe",
  "globe",
  "rotaryphone",
  "typewriter",
  "tinrobot",
  "windupbird",
  "modelplane",
  "dollhouse",
  "train",
  "chessset",
] as const;

export const SUPPORTED_WALK_KINDS: readonly string[] = [
  ...LIGHT_KINDS,
  ...CONTAINER_KINDS,
  ...SEAT_KINDS,
  ...MUSIC_KINDS,
  ...KEEPSAKE_KINDS,
];

const DEFINITIONS = new Map<string, Definition>();

function register(kinds: readonly string[], definition: Definition): void {
  kinds.forEach((kind) => DEFINITIONS.set(kind, definition));
}

register(LIGHT_KINDS, {
  family: "light",
  initial: "off",
  next: toggle("off", "on"),
  label: (state) => (state === "on" ? "Switch off" : "Switch on"),
});
register(CONTAINER_KINDS, {
  family: "container",
  initial: "closed",
  next: toggle("closed", "open"),
  label: (state) => (state === "open" ? "Close" : "Open"),
});
register(SEAT_KINDS, {
  family: "seat",
  initial: "idle",
  next: toggle("idle", "seated"),
  label: (state) => (state === "seated" ? "Stand up" : "Sit down"),
});
register(MUSIC_KINDS, {
  family: "music",
  initial: "stopped",
  next: toggle("stopped", "playing"),
  label: (state) => (state === "playing" ? "Stop music" : "Play music"),
});
register(KEEPSAKE_KINDS, {
  family: "keepsake",
  initial: "unseen",
  next: () => "inspected",
  label: (state) => (state === "inspected" ? "Look again" : "Inspect"),
});

function isWalkState(value: unknown): value is WalkInteractionState {
  return [
    "off",
    "on",
    "closed",
    "open",
    "idle",
    "seated",
    "stopped",
    "playing",
    "unseen",
    "inspected",
  ].includes(String(value));
}

function compatibleState(definition: Definition, state: WalkInteractionState): boolean {
  const allowed: Record<WalkInteractionFamily, WalkInteractionState[]> = {
    light: ["off", "on"],
    container: ["closed", "open"],
    seat: ["idle", "seated"],
    music: ["stopped", "playing"],
    keepsake: ["unseen", "inspected"],
  };
  return allowed[definition.family].includes(state);
}

export class WalkInteractionEngine {
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly onChange?: (changes: readonly WalkInteractionChange[]) => void;
  private readonly objects = new Map<
    string,
    { kind: string; state: WalkInteractionState; lastInteractedAt: number }
  >();
  private activeSeatId?: string;
  private activeMusicId?: string;

  constructor(options: WalkInteractionOptions = {}) {
    this.cooldownMs = Math.max(0, Math.floor(options.cooldownMs ?? 350));
    this.now = options.now ?? Date.now;
    this.onChange = options.onChange;
    if (options.initialState !== undefined) this.restore(options.initialState);
  }

  static supports(kind: string): boolean {
    return DEFINITIONS.has(kind);
  }

  getPrompt(object: WalkObjectRef, at = this.now()): WalkInteractionPrompt | undefined {
    const definition = DEFINITIONS.get(object.kind);
    if (!definition) return undefined;
    const record = this.objects.get(object.id);
    const state = record?.kind === object.kind ? record.state : definition.initial;
    const elapsed = record ? at - record.lastInteractedAt : Number.POSITIVE_INFINITY;
    const cooldownRemainingMs = Math.max(0, this.cooldownMs - Math.max(0, elapsed));
    return {
      objectId: object.id,
      family: definition.family,
      actionLabel: definition.label(state),
      state,
      cooldownRemainingMs,
      available: cooldownRemainingMs === 0,
    };
  }

  interact(object: WalkObjectRef, at = this.now()): WalkInteractionResult {
    const definition = DEFINITIONS.get(object.kind);
    if (!definition) {
      return {
        status: "unsupported",
        changes: [],
        announcement: `${object.name ?? "This object"} cannot be used in Walk mode.`,
      };
    }
    const existing = this.objects.get(object.id);
    if (existing && existing.kind !== object.kind) this.removeObject(object.id);
    const prompt = this.getPrompt(object, at)!;
    if (!prompt.available) {
      return {
        status: "cooldown",
        prompt,
        changes: [],
        announcement: "Give it a moment.",
      };
    }

    const next = definition.next(prompt.state);
    const changes: WalkInteractionChange[] = [];
    if (definition.family === "seat" && next === "seated" && this.activeSeatId !== object.id) {
      this.resetExclusive(this.activeSeatId, "seat", "idle", changes);
      this.activeSeatId = object.id;
    } else if (definition.family === "seat" && next === "idle") {
      this.activeSeatId = undefined;
    }
    if (definition.family === "music" && next === "playing" && this.activeMusicId !== object.id) {
      this.resetExclusive(this.activeMusicId, "music", "stopped", changes);
      this.activeMusicId = object.id;
    } else if (definition.family === "music" && next === "stopped") {
      this.activeMusicId = undefined;
    }

    this.objects.set(object.id, { kind: object.kind, state: next, lastInteractedAt: at });
    changes.push({
      objectId: object.id,
      kind: object.kind,
      family: definition.family,
      previous: prompt.state,
      state: next,
    });
    this.onChange?.(changes);
    const nextPrompt = this.getPrompt(object, at)!;
    return {
      status: "applied",
      prompt: nextPrompt,
      changes,
      announcement: this.announcement(object.name ?? object.kind, definition.family, next),
    };
  }

  removeObject(objectId: string): void {
    this.objects.delete(objectId);
    if (this.activeSeatId === objectId) this.activeSeatId = undefined;
    if (this.activeMusicId === objectId) this.activeMusicId = undefined;
  }

  serialize(): WalkInteractionSave {
    return {
      version: WALK_INTERACTION_SAVE_VERSION,
      objects: Object.fromEntries(
        [...this.objects.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, record]) => [id, { ...record }]),
      ),
      activeSeatId: this.activeSeatId,
      activeMusicId: this.activeMusicId,
    };
  }

  restore(value: unknown): void {
    this.objects.clear();
    this.activeSeatId = undefined;
    this.activeMusicId = undefined;
    if (!value || typeof value !== "object") return;
    const save = value as Partial<WalkInteractionSave>;
    if (save.version !== WALK_INTERACTION_SAVE_VERSION || !save.objects || typeof save.objects !== "object") return;
    for (const [id, candidate] of Object.entries(save.objects)) {
      if (!candidate || typeof candidate !== "object") continue;
      const record = candidate as { kind?: unknown; state?: unknown; lastInteractedAt?: unknown };
      if (
        typeof record.kind !== "string" ||
        !isWalkState(record.state) ||
        typeof record.lastInteractedAt !== "number" ||
        !Number.isFinite(record.lastInteractedAt)
      ) continue;
      const definition = DEFINITIONS.get(record.kind);
      if (!definition || !compatibleState(definition, record.state)) continue;
      this.objects.set(id, {
        kind: record.kind,
        state: record.state,
        lastInteractedAt: record.lastInteractedAt,
      });
    }
    if (typeof save.activeSeatId === "string") {
      const seat = this.objects.get(save.activeSeatId);
      if (seat?.state === "seated") this.activeSeatId = save.activeSeatId;
    }
    if (typeof save.activeMusicId === "string") {
      const music = this.objects.get(save.activeMusicId);
      if (music?.state === "playing") this.activeMusicId = save.activeMusicId;
    }
    this.normalizeExclusiveState("seat", this.activeSeatId, "idle");
    this.normalizeExclusiveState("music", this.activeMusicId, "stopped");
  }

  private resetExclusive(
    objectId: string | undefined,
    family: WalkInteractionFamily,
    state: WalkInteractionState,
    changes: WalkInteractionChange[],
  ): void {
    if (!objectId) return;
    const current = this.objects.get(objectId);
    if (!current) return;
    const definition = DEFINITIONS.get(current.kind);
    if (!definition || definition.family !== family || current.state === state) return;
    changes.push({
      objectId,
      kind: current.kind,
      family,
      previous: current.state,
      state,
    });
    current.state = state;
  }

  private normalizeExclusiveState(
    family: WalkInteractionFamily,
    activeId: string | undefined,
    inactiveState: WalkInteractionState,
  ): void {
    for (const [id, record] of this.objects) {
      const definition = DEFINITIONS.get(record.kind);
      if (definition?.family === family && id !== activeId) record.state = inactiveState;
    }
  }

  private announcement(name: string, family: WalkInteractionFamily, state: WalkInteractionState): string {
    if (family === "light") return `${name} switched ${state}.`;
    if (family === "container") return `${name} ${state}.`;
    if (family === "seat") return state === "seated" ? `Sitting at ${name}.` : `Stood up from ${name}.`;
    if (family === "music") return state === "playing" ? `${name} is playing.` : `${name} stopped.`;
    return state === "inspected" ? `Looked closely at ${name}.` : `${name}.`;
  }
}
