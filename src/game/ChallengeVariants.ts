export const CHALLENGE_SESSION_VERSION = 1;

export type ChallengeShape = "rectangle" | "l" | "t" | "u";

export type ChallengeItem = {
  id: string;
  kind: string;
  category?: string;
  color?: number;
  materialFamily?: string;
  semanticTags?: string[];
  supportId?: string;
  starter?: boolean;
  payload?: Record<string, unknown>;
};

export type ChallengeRoom = {
  id: string;
  name: string;
  width: number;
  depth: number;
  shape: ChallengeShape;
  items: ChallengeItem[];
  photoCount?: number;
  metadata?: Record<string, unknown>;
};

export type ChallengeVariantId =
  | "tiny-room"
  | "five-things"
  | "one-palette"
  | "awkward-floor-plan"
  | "reuse-starter"
  | "photo-challenge";

export type ChallengeReward = {
  id: string;
  title: string;
  description: string;
  cosmeticOnly: true;
};

export type ChallengeConditionProgress = {
  id: string;
  label: string;
  complete: boolean;
  message: string;
  current?: number | string;
  target?: number | string;
};

export type ChallengeEvaluation = {
  complete: boolean;
  completedConditions: number;
  totalConditions: number;
  conditions: ChallengeConditionProgress[];
  reward: ChallengeReward;
};

export type ChallengeSessionStatus = "active" | "completed" | "abandoned" | "sandbox";

export type ChallengeSessionSave = {
  version: number;
  id: string;
  variantId: ChallengeVariantId;
  sourceRoomId: string;
  challengeRoomId: string;
  requiredStarterIds: string[];
  startedAt: number;
  completedAt?: number;
  status: ChallengeSessionStatus;
  rewardClaimed: boolean;
};

export type StartChallengeOptions = {
  idFactory?: () => string;
  now?: () => number;
};

export type StartedChallenge = {
  room: ChallengeRoom;
  session: ChallengeSession;
  introduction: {
    title: string;
    premise: string;
    rules: string[];
    reward: ChallengeReward;
  };
};

type ChallengeDefinition = {
  id: ChallengeVariantId;
  title: string;
  premise: string;
  rules: string[];
  reward: ChallengeReward;
  prepare?: (room: ChallengeRoom) => void;
  evaluate: (room: ChallengeRoom, session: ChallengeSessionSave) => ChallengeConditionProgress[];
};

const reward = (id: string, title: string, description: string): ChallengeReward => ({
  id,
  title,
  description,
  cosmeticOnly: true,
});

const itemCount = (
  room: ChallengeRoom,
  minimum: number,
  maximum: number,
): ChallengeConditionProgress => ({
  id: "item-count",
  label:
    maximum >= Number.MAX_SAFE_INTEGER
      ? `Use at least ${minimum} things`
      : `Use between ${minimum} and ${maximum} things`,
  complete: room.items.length >= minimum && room.items.length <= maximum,
  message:
    room.items.length < minimum
      ? `Add ${minimum - room.items.length} more ${minimum - room.items.length === 1 ? "thing" : "things"}.`
      : room.items.length > maximum
        ? `Remove ${room.items.length - maximum} ${room.items.length - maximum === 1 ? "thing" : "things"}, or continue freely.`
        : `${room.items.length} things fits the brief.`,
  current: room.items.length,
  target: maximum >= Number.MAX_SAFE_INTEGER ? `${minimum}+` : `${minimum}–${maximum}`,
});

function hasSemantic(room: ChallengeRoom, tag: string): boolean {
  return room.items.some(
    (item) =>
      item.category === tag ||
      item.semanticTags?.includes(tag) ||
      item.payload?.semanticTag === tag,
  );
}

const DEFINITIONS: Record<ChallengeVariantId, ChallengeDefinition> = {
  "tiny-room": {
    id: "tiny-room",
    title: "Tiny Room",
    premise: "Make a small room feel intentional and welcoming.",
    rules: ["The duplicate room is 10 m × 8 m.", "Use at least three things.", "Include seating and a light."],
    reward: reward("frame-tiny-room", "Small-space frame", "A compact scrapbook frame for a carefully used space."),
    prepare: (room) => {
      room.width = 10;
      room.depth = 8;
    },
    evaluate: (room) => [
      {
        id: "dimensions",
        label: "Keep the tiny floor plan",
        complete: room.width <= 10 && room.depth <= 8,
        message:
          room.width <= 10 && room.depth <= 8
            ? "The room still has its tiny footprint."
            : "Bring width back to 10 m and depth to 8 m, or continue freely.",
        current: `${room.width} m × ${room.depth} m`,
        target: "10 m × 8 m or smaller",
      },
      {
        id: "seating",
        label: "Include somewhere to sit",
        complete: hasSemantic(room, "seating"),
        message: hasSemantic(room, "seating")
          ? "There is somewhere to sit."
          : "Add any chair, sofa, bench, or other seating.",
      },
      {
        id: "light",
        label: "Include a light",
        complete: hasSemantic(room, "light"),
        message: hasSemantic(room, "light")
          ? "The small room has a source of light."
          : "Add any practical or ambient light.",
      },
      itemCount(room, 3, Number.MAX_SAFE_INTEGER),
    ],
  },
  "five-things": {
    id: "five-things",
    title: "Five Things Only",
    premise: "See how much character can come from a handful of choices.",
    rules: ["Use at least two and no more than five things.", "Empty space is part of the design."],
    reward: reward("paper-five-things", "Quiet-space paper", "A spacious scrapbook paper for restrained rooms."),
    evaluate: (room) => [itemCount(room, 2, 5)],
  },
  "one-palette": {
    id: "one-palette",
    title: "One Palette",
    premise: "Create unity through color or material—whichever is more useful to you.",
    rules: ["Use at least three things.", "Use one color family or one material family; color is never the only route."],
    reward: reward("material-linen-wash", "Linen wash", "A soft material variant unlocked through a cohesive room."),
    evaluate: (room) => {
      const colors = new Set(room.items.flatMap((item) => Number.isInteger(item.color) ? [item.color] : []));
      const materials = new Set(room.items.flatMap((item) => item.materialFamily ? [item.materialFamily] : []));
      const cohesive = room.items.length >= 3 && (colors.size === 1 || materials.size === 1);
      return [
        itemCount(room, 3, Number.MAX_SAFE_INTEGER),
        {
          id: "cohesion",
          label: "Use one color or material family",
          complete: cohesive,
          message: cohesive
            ? colors.size === 1
              ? "The room shares one color family."
              : "The room shares one material family."
            : "Choose one shared color family, or use the same material family instead.",
          current: `${colors.size} colors / ${materials.size} materials`,
          target: "1 color or 1 material",
        },
      ];
    },
  },
  "awkward-floor-plan": {
    id: "awkward-floor-plan",
    title: "Awkward Floor Plan",
    premise: "Give an unusual shape a clear and welcoming purpose.",
    rules: ["Keep an L, T, or U floor plan.", "Include seating, storage, and light."],
    reward: reward("template-corner-studio", "Corner studio template", "An optional unusual-shape starting layout."),
    prepare: (room) => {
      if (room.shape === "rectangle") room.shape = "l";
    },
    evaluate: (room) => {
      const semantic = (tag: string) => hasSemantic(room, tag);
      return [
        {
          id: "shape",
          label: "Use an unusual floor plan",
          complete: room.shape !== "rectangle",
          message: room.shape !== "rectangle" ? `${room.shape.toUpperCase()} shape is in use.` : "Choose an L, T, or U shape.",
          current: room.shape,
          target: "L, T, or U",
        },
        ...(["seating", "storage", "light"] as const).map((tag) => ({
          id: tag,
          label: `Include ${tag}`,
          complete: semantic(tag),
          message: semantic(tag) ? `${tag[0].toUpperCase()}${tag.slice(1)} is included.` : `Add any object tagged ${tag}.`,
        })),
      ];
    },
  },
  "reuse-starter": {
    id: "reuse-starter",
    title: "Reuse the Starter Furniture",
    premise: "Transform the room without throwing away what was already there.",
    rules: ["Keep every starter item.", "Move or re-style freely.", "Add at least one new thing."],
    reward: reward("frame-second-life", "Second-life frame", "A scrapbook frame celebrating reuse."),
    evaluate: (room, session) => {
      const present = new Set(room.items.map((item) => item.id));
      const kept = session.requiredStarterIds.filter((id) => present.has(id)).length;
      const newItems = room.items.filter((item) => !session.requiredStarterIds.includes(item.id)).length;
      return [
        {
          id: "starter-items",
          label: "Keep every starter item",
          complete: kept === session.requiredStarterIds.length,
          message:
            kept === session.requiredStarterIds.length
              ? "Every starter item is still part of the room."
              : `Restore ${session.requiredStarterIds.length - kept} starter ${session.requiredStarterIds.length - kept === 1 ? "item" : "items"}.`,
          current: kept,
          target: session.requiredStarterIds.length,
        },
        {
          id: "new-item",
          label: "Add something new",
          complete: newItems >= 1,
          message: newItems >= 1 ? "Something new has joined the starter furniture." : "Add one new thing of your choice.",
          current: newItems,
          target: 1,
        },
      ];
    },
  },
  "photo-challenge": {
    id: "photo-challenge",
    title: "Photo Challenge",
    premise: "Finish by finding a view that captures the room's feeling.",
    rules: ["Use at least three things.", "Save a photo when the room feels ready."],
    reward: reward("title-room-portrait", "Room portrait title", "A title treatment for scrapbook photographs."),
    evaluate: (room) => [
      itemCount(room, 3, Number.MAX_SAFE_INTEGER),
      {
        id: "photo",
        label: "Save a room photo",
        complete: (room.photoCount ?? 0) >= 1,
        message: (room.photoCount ?? 0) >= 1 ? "The room portrait is saved." : "Take and save one room photo.",
        current: room.photoCount ?? 0,
        target: 1,
      },
    ],
  },
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cleanName(value: string): string {
  return value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 60) || "Challenge room";
}

export function listChallengeVariants(): Array<
  Pick<ChallengeDefinition, "id" | "title" | "premise" | "rules" | "reward">
> {
  return Object.values(DEFINITIONS).map(({ id, title, premise, rules, reward: challengeReward }) => ({
    id,
    title,
    premise,
    rules: [...rules],
    reward: clone(challengeReward),
  }));
}

export class ChallengeSession {
  private save: ChallengeSessionSave;
  private readonly now: () => number;

  constructor(save: ChallengeSessionSave, now: () => number = Date.now) {
    if (
      save.version !== CHALLENGE_SESSION_VERSION ||
      !DEFINITIONS[save.variantId] ||
      !save.id ||
      !save.sourceRoomId ||
      !save.challengeRoomId ||
      !["active", "completed", "abandoned", "sandbox"].includes(save.status) ||
      !Array.isArray(save.requiredStarterIds)
    ) {
      throw new Error("Challenge session data is invalid or unsupported.");
    }
    this.save = clone(save);
    this.now = now;
  }

  evaluate(room: ChallengeRoom): ChallengeEvaluation {
    if (room.id !== this.save.challengeRoomId) {
      throw new Error("This challenge session belongs to a different room.");
    }
    const definition = DEFINITIONS[this.save.variantId];
    const conditions = definition.evaluate(room, this.save);
    const completedConditions = conditions.filter((condition) => condition.complete).length;
    const currentlyComplete = conditions.length > 0 && completedConditions === conditions.length;
    if (currentlyComplete && this.save.status === "active") {
      this.save.status = "completed";
      this.save.completedAt = this.now();
    }
    const complete = currentlyComplete || this.save.completedAt !== undefined;
    return {
      complete,
      completedConditions,
      totalConditions: conditions.length,
      conditions,
      reward: clone(definition.reward),
    };
  }

  claimReward(room: ChallengeRoom): ChallengeReward | undefined {
    const evaluation = this.evaluate(room);
    if (!evaluation.complete || this.save.completedAt === undefined || this.save.rewardClaimed) return undefined;
    this.save.rewardClaimed = true;
    return evaluation.reward;
  }

  abandon(): ChallengeSessionSave {
    if (this.save.status === "active") this.save.status = "abandoned";
    return this.serialize();
  }

  continueFreely(): ChallengeSessionSave {
    this.save.status = "sandbox";
    return this.serialize();
  }

  serialize(): ChallengeSessionSave {
    return clone(this.save);
  }
}

export function startChallenge(
  variantId: ChallengeVariantId,
  source: ChallengeRoom,
  options: StartChallengeOptions = {},
): StartedChallenge {
  const definition = DEFINITIONS[variantId];
  if (!definition) throw new Error(`Unknown challenge variant: ${variantId}`);
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const now = options.now ?? Date.now;
  const sourceSnapshot = clone(source);
  const room = clone(source);
  const reserved = new Set(source.items.map((item) => item.id));
  reserved.add(source.id);
  const nextId = () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = idFactory();
      if (candidate && !reserved.has(candidate)) {
        reserved.add(candidate);
        return candidate;
      }
    }
    throw new Error("Could not create a unique challenge ID.");
  };
  const roomId = nextId();
  const itemMap = new Map<string, string>();
  room.items.forEach((item) => itemMap.set(item.id, nextId()));
  room.id = roomId;
  room.name = cleanName(`${definition.title} · ${source.name}`);
  room.items = room.items.map((item) => ({
    ...item,
    id: itemMap.get(item.id)!,
    supportId: item.supportId ? itemMap.get(item.supportId) : undefined,
  }));
  room.metadata = {
    ...(room.metadata ?? {}),
    challengeVariant: variantId,
    sourceRoomId: source.id,
  };
  definition.prepare?.(room);
  const requiredStarterIds = sourceSnapshot.items
    .filter((item) => item.starter)
    .flatMap((item) => {
      const mapped = itemMap.get(item.id);
      return mapped ? [mapped] : [];
    });
  const save: ChallengeSessionSave = {
    version: CHALLENGE_SESSION_VERSION,
    id: nextId(),
    variantId,
    sourceRoomId: source.id,
    challengeRoomId: room.id,
    requiredStarterIds,
    startedAt: now(),
    status: "active",
    rewardClaimed: false,
  };
  return {
    room,
    session: new ChallengeSession(save, now),
    introduction: {
      title: definition.title,
      premise: definition.premise,
      rules: [...definition.rules],
      reward: clone(definition.reward),
    },
  };
}
