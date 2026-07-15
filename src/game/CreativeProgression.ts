export const CREATIVE_PROGRESSION_VERSION = 1;

export type StoryProgressUpdate = {
  storyId: string;
  completedSteps: number;
  totalSteps: number;
  complete: boolean;
};

export type CreativeEvent =
  | { type: "room-created"; roomId: string }
  | { type: "photo-saved"; photoId: string }
  | { type: "walk-interaction"; objectId: string }
  | { type: "shape-used"; shape: "rectangle" | "l" | "t" | "u" }
  | { type: "snapshot-restored"; snapshotId: string };

export type StoryAchievement = {
  currentSteps: number;
  bestSteps: number;
  totalSteps: number;
  completedAt?: number;
  updatedAt: number;
};

export type CreativeBadgeId =
  | "first-story"
  | "story-weaver"
  | "memory-keeper"
  | "room-inhabitant"
  | "room-maker"
  | "shape-explorer"
  | "safe-experimenter";

export type CreativeUnlockId =
  | "scrapbook-frame-botanical"
  | "scrapbook-paper-twilight"
  | "ambience-evening-rain"
  | "room-template-sunroom";

export type CreativeReward = {
  id: CreativeBadgeId | CreativeUnlockId;
  type: "badge" | "unlock";
  title: string;
  description: string;
};

export type CreativeProgressionSave = {
  version: number;
  stories: Record<string, StoryAchievement>;
  completedStoryIds: string[];
  roomIds: string[];
  photoIds: string[];
  interactedObjectIds: string[];
  shapesUsed: Array<"rectangle" | "l" | "t" | "u">;
  restoredSnapshotIds: string[];
  badges: CreativeBadgeId[];
  unlocks: CreativeUnlockId[];
};

export type CreativeProgressionOptions = {
  initialState?: unknown;
  now?: () => number;
  onRewards?: (rewards: readonly CreativeReward[]) => void;
};

export type ProgressionUpdateResult = {
  state: CreativeProgressionSave;
  rewards: CreativeReward[];
};

const BADGES: Record<CreativeBadgeId, Omit<CreativeReward, "id" | "type">> = {
  "first-story": {
    title: "A story of your own",
    description: "Completed a first room story.",
  },
  "story-weaver": {
    title: "Story weaver",
    description: "Completed three different room stories.",
  },
  "memory-keeper": {
    title: "Memory keeper",
    description: "Saved five room photographs.",
  },
  "room-inhabitant": {
    title: "A room lived in",
    description: "Used five different objects in Walk mode.",
  },
  "room-maker": {
    title: "Room maker",
    description: "Created three rooms without replacing an older one.",
  },
  "shape-explorer": {
    title: "New shapes, new ideas",
    description: "Designed with three different room shapes.",
  },
  "safe-experimenter": {
    title: "Worth another look",
    description: "Returned to a saved snapshot.",
  },
};

const UNLOCKS: Record<CreativeUnlockId, Omit<CreativeReward, "id" | "type">> = {
  "scrapbook-frame-botanical": {
    title: "Botanical scrapbook frame",
    description: "A decorative frame for remembering completed rooms.",
  },
  "scrapbook-paper-twilight": {
    title: "Twilight scrapbook paper",
    description: "A calm paper treatment for room memories.",
  },
  "ambience-evening-rain": {
    title: "Evening rain ambience",
    description: "An optional private soundscape for Walk mode.",
  },
  "room-template-sunroom": {
    title: "Sunroom template",
    description: "An optional starting layout; all building tools remain available.",
  },
};

const SHAPES = new Set(["rectangle", "l", "t", "u"]);

function unique(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value)))];
}

function finiteInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

export class CreativeProgressionTracker {
  private readonly now: () => number;
  private readonly onRewards?: (rewards: readonly CreativeReward[]) => void;
  private state: CreativeProgressionSave = this.emptyState();

  constructor(options: CreativeProgressionOptions = {}) {
    this.now = options.now ?? Date.now;
    this.onRewards = options.onRewards;
    if (options.initialState !== undefined) this.restore(options.initialState);
  }

  updateStory(update: StoryProgressUpdate): ProgressionUpdateResult {
    const storyId = update.storyId.trim().slice(0, 100);
    if (!storyId) return this.result([]);
    const timestamp = this.now();
    const totalSteps = Math.max(1, finiteInteger(update.totalSteps, 1));
    const currentSteps = Math.min(totalSteps, finiteInteger(update.completedSteps));
    const previous = this.state.stories[storyId];
    const completed = previous?.completedAt !== undefined || update.complete || currentSteps >= totalSteps;
    this.state.stories[storyId] = {
      currentSteps,
      bestSteps: Math.min(totalSteps, Math.max(previous?.bestSteps ?? 0, currentSteps)),
      totalSteps,
      completedAt: previous?.completedAt ?? (completed ? timestamp : undefined),
      updatedAt: timestamp,
    };
    if (completed && !this.state.completedStoryIds.includes(storyId)) {
      this.state.completedStoryIds.push(storyId);
    }
    return this.applyRewards();
  }

  record(event: CreativeEvent): ProgressionUpdateResult {
    if (event.type === "room-created") this.state.roomIds = unique([...this.state.roomIds, event.roomId]);
    if (event.type === "photo-saved") this.state.photoIds = unique([...this.state.photoIds, event.photoId]);
    if (event.type === "walk-interaction") {
      this.state.interactedObjectIds = unique([...this.state.interactedObjectIds, event.objectId]);
    }
    if (event.type === "shape-used" && SHAPES.has(event.shape)) {
      this.state.shapesUsed = unique([...this.state.shapesUsed, event.shape]) as CreativeProgressionSave["shapesUsed"];
    }
    if (event.type === "snapshot-restored") {
      this.state.restoredSnapshotIds = unique([
        ...this.state.restoredSnapshotIds,
        event.snapshotId,
      ]);
    }
    return this.applyRewards();
  }

  getStory(storyId: string): StoryAchievement | undefined {
    const story = this.state.stories[storyId];
    return story ? { ...story } : undefined;
  }

  serialize(): CreativeProgressionSave {
    return structuredClone(this.state);
  }

  restore(value: unknown): CreativeProgressionSave {
    this.state = this.sanitize(value);
    return this.serialize();
  }

  private applyRewards(): ProgressionUpdateResult {
    const rewards: CreativeReward[] = [];
    const completed = this.state.completedStoryIds.length;
    this.grantBadge("first-story", completed >= 1, rewards);
    this.grantBadge("story-weaver", completed >= 3, rewards);
    this.grantBadge("memory-keeper", this.state.photoIds.length >= 5, rewards);
    this.grantBadge("room-inhabitant", this.state.interactedObjectIds.length >= 5, rewards);
    this.grantBadge("room-maker", this.state.roomIds.length >= 3, rewards);
    this.grantBadge("shape-explorer", this.state.shapesUsed.length >= 3, rewards);
    this.grantBadge("safe-experimenter", this.state.restoredSnapshotIds.length >= 1, rewards);

    this.grantUnlock("scrapbook-frame-botanical", completed >= 1, rewards);
    this.grantUnlock("scrapbook-paper-twilight", this.state.photoIds.length >= 5, rewards);
    this.grantUnlock("ambience-evening-rain", completed >= 3, rewards);
    this.grantUnlock("room-template-sunroom", this.state.roomIds.length >= 3, rewards);
    if (rewards.length) this.onRewards?.(rewards);
    return this.result(rewards);
  }

  private grantBadge(id: CreativeBadgeId, condition: boolean, rewards: CreativeReward[]): void {
    if (!condition || this.state.badges.includes(id)) return;
    this.state.badges.push(id);
    rewards.push({ id, type: "badge", ...BADGES[id] });
  }

  private grantUnlock(id: CreativeUnlockId, condition: boolean, rewards: CreativeReward[]): void {
    if (!condition || this.state.unlocks.includes(id)) return;
    this.state.unlocks.push(id);
    rewards.push({ id, type: "unlock", ...UNLOCKS[id] });
  }

  private result(rewards: CreativeReward[]): ProgressionUpdateResult {
    return { state: this.serialize(), rewards };
  }

  private emptyState(): CreativeProgressionSave {
    return {
      version: CREATIVE_PROGRESSION_VERSION,
      stories: {},
      completedStoryIds: [],
      roomIds: [],
      photoIds: [],
      interactedObjectIds: [],
      shapesUsed: [],
      restoredSnapshotIds: [],
      badges: [],
      unlocks: [],
    };
  }

  private sanitize(value: unknown): CreativeProgressionSave {
    if (!value || typeof value !== "object") return this.emptyState();
    const input = value as Partial<CreativeProgressionSave>;
    if (input.version !== CREATIVE_PROGRESSION_VERSION) return this.emptyState();
    const stories: Record<string, StoryAchievement> = {};
    if (input.stories && typeof input.stories === "object") {
      for (const [id, candidate] of Object.entries(input.stories)) {
        if (!candidate || typeof candidate !== "object" || !id) continue;
        const source = candidate as Partial<StoryAchievement>;
        const totalSteps = Math.max(1, finiteInteger(source.totalSteps, 1));
        const currentSteps = Math.min(totalSteps, finiteInteger(source.currentSteps));
        stories[id.slice(0, 100)] = {
          currentSteps,
          bestSteps: Math.max(currentSteps, Math.min(totalSteps, finiteInteger(source.bestSteps))),
          totalSteps,
          completedAt:
            typeof source.completedAt === "number" && Number.isFinite(source.completedAt)
              ? source.completedAt
              : undefined,
          updatedAt: finiteInteger(source.updatedAt),
        };
      }
    }
    const completedStoryIds = unique(input.completedStoryIds ?? []).filter(
      (id) => stories[id]?.completedAt !== undefined,
    );
    return {
      version: CREATIVE_PROGRESSION_VERSION,
      stories,
      completedStoryIds,
      roomIds: unique(input.roomIds ?? []),
      photoIds: unique(input.photoIds ?? []),
      interactedObjectIds: unique(input.interactedObjectIds ?? []),
      shapesUsed: unique(input.shapesUsed ?? []).filter((shape) => SHAPES.has(shape)) as CreativeProgressionSave["shapesUsed"],
      restoredSnapshotIds: unique(input.restoredSnapshotIds ?? []),
      badges: unique(input.badges ?? []).filter((id) => Object.hasOwn(BADGES, id)) as CreativeBadgeId[],
      unlocks: unique(input.unlocks ?? []).filter((id) => Object.hasOwn(UNLOCKS, id)) as CreativeUnlockId[],
    };
  }
}
