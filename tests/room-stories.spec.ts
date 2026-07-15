import { expect, test } from "@playwright/test";
import {
  evaluateRoomStory,
  ROOM_STORIES,
  semanticTagsForItem,
} from "../src/game/RoomStories";

test("the first Room Story accepts varied semantic choices", () => {
  const story = ROOM_STORIES.find((candidate) => candidate.firstSession);
  expect(story).toBeDefined();
  if (!story) return;

  const progress = evaluateRoomStory(story, {
    shape: "rectangle",
    items: [
      { kind: "rr-armchair", category: "realroom" },
      { kind: "rr-task-lamp", category: "realroom" },
      { kind: "plant", category: "plant" },
    ],
    lookedAround: true,
    editedObject: true,
    enteredWalk: true,
    photoCount: 1,
  });

  expect(progress.complete).toBe(true);
  expect(progress.completedSteps).toBe(progress.totalSteps);
});

test("stories explain incomplete requirements without aesthetic scoring", () => {
  const story = ROOM_STORIES.find((candidate) => candidate.id === "awkward-shape");
  expect(story).toBeDefined();
  if (!story) return;

  const progress = evaluateRoomStory(story, {
    shape: "rectangle",
    items: [{ kind: "chair", category: "furniture" }],
  });

  expect(progress.complete).toBe(false);
  expect(progress.steps.filter((step) => !step.complete).map((step) => step.shortLabel)).toEqual([
    "Choose an unusual shape",
    "Add storage",
    "Add light",
  ]);
});

test("semantic tags expose inclusive relationships", () => {
  expect(semanticTagsForItem({ kind: "rockingchair", category: "furniture" })).toContain(
    "seating",
  );
  expect([...semanticTagsForItem({ kind: "musicbox", category: "keepsake" })]).toEqual(
    expect.arrayContaining(["music", "personal", "interactive"]),
  );
});
