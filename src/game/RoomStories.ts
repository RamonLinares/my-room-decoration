export type RoomShapeId = "rectangle" | "l" | "t" | "u";

export type StoryCatalogCategory =
  | "beds"
  | "furniture"
  | "workspace"
  | "light"
  | "decor"
  | "keepsake"
  | "plant"
  | "realroom";

export type StorySemanticTag =
  | "bed"
  | "seating"
  | "surface"
  | "storage"
  | "task-light"
  | "ambient-light"
  | "personal"
  | "soft-furnishing"
  | "music"
  | "plant"
  | "workspace"
  | "wall-decor"
  | "interactive";

export type StoryRoomItem = {
  kind: string;
  category: StoryCatalogCategory;
  color?: number;
};

export type StoryRoomState = {
  items: StoryRoomItem[];
  shape: RoomShapeId;
  photoCount?: number;
  lookedAround?: boolean;
  enteredWalk?: boolean;
  editedObject?: boolean;
};

type TagRequirement = {
  type: "tag";
  tag: StorySemanticTag;
  count?: number;
};

type ItemCountRequirement = {
  type: "item-count";
  maximum?: number;
  minimum?: number;
};

type ShapeRequirement = {
  type: "shape";
  accepted: RoomShapeId[];
};

type DistinctColorRequirement = {
  type: "distinct-colors";
  minimum: number;
};

type ExperienceRequirement = {
  type: "experience";
  milestone: "look" | "walk" | "photo" | "edit";
};

export type RoomStoryRequirement =
  | TagRequirement
  | ItemCountRequirement
  | ShapeRequirement
  | DistinctColorRequirement
  | ExperienceRequirement;

export type RoomStoryStep = {
  id: string;
  label: string;
  shortLabel: string;
  requirement: RoomStoryRequirement;
};

export type RoomStory = {
  id: string;
  title: string;
  premise: string;
  prompt: string;
  steps: RoomStoryStep[];
  optionalConstraint?: string;
  suggestedShape?: RoomShapeId;
  scrapbookTitle: string;
  firstSession?: boolean;
};

export type RoomStoryProgress = {
  storyId: string;
  complete: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: Array<RoomStoryStep & { complete: boolean }>;
};

const TAGGED_KINDS: Partial<Record<StorySemanticTag, ReadonlySet<string>>> = {
  seating: new Set([
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
    "rr-armchair",
    "rr-ergonomic-chair",
  ]),
  surface: new Set([
    "desk",
    "deskset",
    "birchtable",
    "coffeetable",
    "nightstand",
    "dresser",
    "sewingtable",
    "teatrolley",
    "nestingtables",
    "dropleaftable",
    "rr-standing-desk",
    "rr-dresser",
    "rr-rolling-drawers",
  ]),
  storage: new Set([
    "shelf",
    "wardrobe",
    "toybox",
    "dresser",
    "filing",
    "tallbookcase",
    "billy",
    "paxdrawers",
    "lowbookcase",
    "cubestorage",
    "laddershelf",
    "cornercabinet",
    "wallshelf",
    "rr-built-in-wardrobe",
    "rr-glass-cabinets",
    "rr-slim-display",
    "rr-dresser",
    "rr-rolling-drawers",
  ]),
  music: new Set(["radio", "record", "musicbox", "speakers"]),
  interactive: new Set([
    "lamp",
    "fairy",
    "lantern",
    "lavalamp",
    "radio",
    "record",
    "musicbox",
    "wardrobe",
    "paxdrawers",
    "chair",
    "armchair",
    "sofa",
    "sectional",
    "bed",
    "daybed",
    "rockingchair",
    "rr-armchair",
    "rr-task-lamp",
    "rr-built-in-wardrobe",
  ]),
  "task-light": new Set(["lamp", "rr-task-lamp", "desklamp"]),
  "ambient-light": new Set([
    "fairy",
    "lantern",
    "candles",
    "lavalamp",
    "rr-ceiling-light",
    "rr-softbox",
  ]),
  "soft-furnishing": new Set([
    "roundrug",
    "memoryrug",
    "cushion",
    "ottoman",
    "floorbed",
    "chaise",
    "blanketladder",
  ]),
  "wall-decor": new Set(["wallframes", "mirror", "clock", "window"]),
};

export const ROOM_STORIES: readonly RoomStory[] = [
  {
    id: "cozy-reading-corner",
    title: "A cozy reading corner",
    premise: "Make one small corner feel like somewhere you would stay awhile.",
    prompt: "Add a seat, a light, and one thing that feels personal.",
    firstSession: true,
    scrapbookTitle: "My first cozy corner",
    steps: [
      {
        id: "look",
        label: "Look around the room from another angle.",
        shortLabel: "Look around",
        requirement: { type: "experience", milestone: "look" },
      },
      {
        id: "seat",
        label: "Place somewhere comfortable to sit.",
        shortLabel: "Add a seat",
        requirement: { type: "tag", tag: "seating" },
      },
      {
        id: "light",
        label: "Add a task light or a softer glow.",
        shortLabel: "Add a light",
        requirement: { type: "tag", tag: "task-light" },
      },
      {
        id: "personal",
        label: "Choose one keepsake, book, plant, or decoration that feels personal.",
        shortLabel: "Add something personal",
        requirement: { type: "tag", tag: "personal" },
      },
      {
        id: "edit",
        label: "Move, turn, resize, or recolor one object.",
        shortLabel: "Make it yours",
        requirement: { type: "experience", milestone: "edit" },
      },
      {
        id: "walk",
        label: "Step into Walk mode and look around.",
        shortLabel: "Walk through it",
        requirement: { type: "experience", milestone: "walk" },
      },
      {
        id: "photo",
        label: "Take a photo to remember the room.",
        shortLabel: "Take a photo",
        requirement: { type: "experience", milestone: "photo" },
      },
    ],
  },
  {
    id: "midnight-idea",
    title: "A desk for a midnight idea",
    premise: "Build a tiny place where a late-night idea could become real.",
    prompt: "Create a workspace with a surface, a light, and something inspiring.",
    scrapbookTitle: "A midnight idea",
    steps: [
      { id: "work", label: "Add a workspace object.", shortLabel: "Add a workspace", requirement: { type: "tag", tag: "workspace" } },
      { id: "surface", label: "Add a desk or useful surface.", shortLabel: "Add a surface", requirement: { type: "tag", tag: "surface" } },
      { id: "light", label: "Add a task light.", shortLabel: "Add a task light", requirement: { type: "tag", tag: "task-light" } },
      { id: "personal", label: "Add one keepsake, book, or plant.", shortLabel: "Add inspiration", requirement: { type: "tag", tag: "personal" } },
    ],
  },
  {
    id: "tiny-room-for-two",
    title: "A tiny room for two",
    premise: "Make a small room feel welcoming without making it crowded.",
    prompt: "Provide two seats, a shared surface, and one soft detail.",
    optionalConstraint: "Try to use no more than eight objects.",
    suggestedShape: "rectangle",
    scrapbookTitle: "Room for two",
    steps: [
      { id: "seats", label: "Add seating for two.", shortLabel: "Two seats", requirement: { type: "tag", tag: "seating", count: 2 } },
      { id: "surface", label: "Add a surface they can share.", shortLabel: "A shared surface", requirement: { type: "tag", tag: "surface" } },
      { id: "soft", label: "Add a rug, cushion, or other soft furnishing.", shortLabel: "Something soft", requirement: { type: "tag", tag: "soft-furnishing" } },
    ],
  },
  {
    id: "memory-room",
    title: "A room from a memory",
    premise: "Use a few objects to recall a place, person, or afternoon.",
    prompt: "Choose three personal objects and preserve the result with a photo.",
    scrapbookTitle: "A room I remember",
    steps: [
      { id: "personal", label: "Add three personal objects.", shortLabel: "Three memories", requirement: { type: "tag", tag: "personal", count: 3 } },
      { id: "photo", label: "Take a photo when it feels right.", shortLabel: "Keep the memory", requirement: { type: "experience", milestone: "photo" } },
    ],
  },
  {
    id: "five-calm-things",
    title: "Five calm things",
    premise: "See how much atmosphere can come from very little.",
    prompt: "Use no more than five objects, including a glow and something growing.",
    optionalConstraint: "The room can stay sparse; empty space is part of the design.",
    scrapbookTitle: "Five calm things",
    steps: [
      { id: "maximum", label: "Use no more than five objects.", shortLabel: "Five or fewer", requirement: { type: "item-count", maximum: 5, minimum: 2 } },
      { id: "light", label: "Add one source of light.", shortLabel: "One glow", requirement: { type: "tag", tag: "ambient-light" } },
      { id: "plant", label: "Add one plant or flower.", shortLabel: "Something growing", requirement: { type: "tag", tag: "plant" } },
    ],
  },
  {
    id: "awkward-shape",
    title: "An awkward room made welcoming",
    premise: "Turn an unusual floor plan into a room with a clear purpose.",
    prompt: "Use an L, T, or U shape with seating, storage, and light.",
    suggestedShape: "l",
    scrapbookTitle: "The awkward room",
    steps: [
      { id: "shape", label: "Choose an L, T, or U floor plan.", shortLabel: "Choose an unusual shape", requirement: { type: "shape", accepted: ["l", "t", "u"] } },
      { id: "seat", label: "Add somewhere to sit.", shortLabel: "Add a seat", requirement: { type: "tag", tag: "seating" } },
      { id: "storage", label: "Add useful storage.", shortLabel: "Add storage", requirement: { type: "tag", tag: "storage" } },
      { id: "light", label: "Add a source of light.", shortLabel: "Add light", requirement: { type: "tag", tag: "ambient-light" } },
    ],
  },
] as const;

export function semanticTagsForItem(item: StoryRoomItem): Set<StorySemanticTag> {
  const tags = new Set<StorySemanticTag>();
  if (item.category === "beds") tags.add("bed");
  if (item.category === "workspace") tags.add("workspace");
  if (item.category === "light") tags.add("ambient-light");
  if (item.category === "keepsake" || item.category === "decor") tags.add("personal");
  if (item.category === "plant") {
    tags.add("plant");
    tags.add("personal");
  }
  for (const [tag, kinds] of Object.entries(TAGGED_KINDS) as Array<
    [StorySemanticTag, ReadonlySet<string>]
  >) {
    if (kinds.has(item.kind)) tags.add(tag);
  }
  if (tags.has("task-light") || tags.has("ambient-light")) tags.add("interactive");
  return tags;
}

function requirementComplete(
  requirement: RoomStoryRequirement,
  state: StoryRoomState,
): boolean {
  switch (requirement.type) {
    case "tag": {
      const count = state.items.reduce(
        (total, item) => total + Number(semanticTagsForItem(item).has(requirement.tag)),
        0,
      );
      return count >= (requirement.count ?? 1);
    }
    case "item-count":
      return (
        state.items.length >= (requirement.minimum ?? 0) &&
        state.items.length <= (requirement.maximum ?? Number.POSITIVE_INFINITY)
      );
    case "shape":
      return requirement.accepted.includes(state.shape);
    case "distinct-colors":
      return new Set(state.items.map((item) => item.color).filter(Number.isInteger)).size >= requirement.minimum;
    case "experience":
      if (requirement.milestone === "look") return Boolean(state.lookedAround);
      if (requirement.milestone === "walk") return Boolean(state.enteredWalk);
      if (requirement.milestone === "photo") return (state.photoCount ?? 0) > 0;
      return Boolean(state.editedObject);
  }
}

export function evaluateRoomStory(
  story: RoomStory,
  state: StoryRoomState,
): RoomStoryProgress {
  const steps = story.steps.map((step) => ({
    ...step,
    complete: requirementComplete(step.requirement, state),
  }));
  const completedSteps = steps.filter((step) => step.complete).length;
  return {
    storyId: story.id,
    complete: completedSteps === steps.length,
    completedSteps,
    totalSteps: steps.length,
    steps,
  };
}

export function roomStoryById(id: string | null | undefined): RoomStory | undefined {
  return ROOM_STORIES.find((story) => story.id === id);
}
