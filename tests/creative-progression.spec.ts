import { expect, test } from "@playwright/test";
import { CreativeProgressionTracker } from "../src/game/CreativeProgression";

test("story progress is calm, transparent, and never revokes completion", () => {
  let now = 100;
  const tracker = new CreativeProgressionTracker({ now: () => now++ });
  tracker.updateStory({ storyId: "cozy", completedSteps: 3, totalSteps: 6, complete: false });
  tracker.updateStory({ storyId: "cozy", completedSteps: 1, totalSteps: 6, complete: false });
  expect(tracker.getStory("cozy")).toMatchObject({ currentSteps: 1, bestSteps: 3 });

  const completed = tracker.updateStory({
    storyId: "cozy",
    completedSteps: 6,
    totalSteps: 6,
    complete: true,
  });
  expect(completed.rewards.map((reward) => reward.id)).toEqual([
    "first-story",
    "scrapbook-frame-botanical",
  ]);
  const completedAt = tracker.getStory("cozy")?.completedAt;
  const later = tracker.updateStory({ storyId: "cozy", completedSteps: 0, totalSteps: 6, complete: false });
  expect(tracker.getStory("cozy")?.completedAt).toBe(completedAt);
  expect(later.rewards).toEqual([]);
});

test("optional badges and unlocks reward breadth without locking core tools", () => {
  const rewards: string[] = [];
  const tracker = new CreativeProgressionTracker({
    onRewards: (items) => rewards.push(...items.map((item) => item.id)),
  });
  for (const storyId of ["one", "two", "three"]) {
    tracker.updateStory({ storyId, completedSteps: 1, totalSteps: 1, complete: true });
  }
  for (const roomId of ["room-1", "room-2", "room-3"]) tracker.record({ type: "room-created", roomId });
  for (const shape of ["rectangle", "l", "u"] as const) tracker.record({ type: "shape-used", shape });
  for (let index = 0; index < 5; index += 1) {
    tracker.record({ type: "photo-saved", photoId: `photo-${index}` });
    tracker.record({ type: "walk-interaction", objectId: `object-${index}` });
  }
  tracker.record({ type: "snapshot-restored", snapshotId: "snapshot-1" });

  const state = tracker.serialize();
  expect(state.badges).toEqual(
    expect.arrayContaining([
      "first-story",
      "story-weaver",
      "memory-keeper",
      "room-inhabitant",
      "room-maker",
      "shape-explorer",
      "safe-experimenter",
    ]),
  );
  expect(state.unlocks).toEqual(
    expect.arrayContaining([
      "scrapbook-frame-botanical",
      "scrapbook-paper-twilight",
      "ambience-evening-rain",
      "room-template-sunroom",
    ]),
  );
  expect(rewards).toHaveLength(new Set(rewards).size);
});

test("progression saves sanitize unknown and duplicated state", () => {
  const tracker = new CreativeProgressionTracker({
    initialState: {
      version: 1,
      stories: {
        calm: {
          currentSteps: 9,
          bestSteps: 20,
          totalSteps: 4,
          completedAt: 50,
          updatedAt: 60,
        },
      },
      completedStoryIds: ["calm", "calm", "missing"],
      roomIds: ["room", "room"],
      photoIds: [],
      interactedObjectIds: [],
      shapesUsed: ["l", "invalid"],
      restoredSnapshotIds: [],
      badges: ["first-story", "unknown"],
      unlocks: ["scrapbook-frame-botanical", "unknown"],
    },
  });
  const state = tracker.serialize();
  expect(state.stories.calm).toMatchObject({ currentSteps: 4, bestSteps: 4, totalSteps: 4 });
  expect(state.completedStoryIds).toEqual(["calm"]);
  expect(state.roomIds).toEqual(["room"]);
  expect(state.shapesUsed).toEqual(["l"]);
  expect(state.badges).toEqual(["first-story"]);
  expect(state.unlocks).toEqual(["scrapbook-frame-botanical"]);
});
