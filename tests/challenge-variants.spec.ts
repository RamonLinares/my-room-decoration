import { expect, test } from "@playwright/test";
import {
  listChallengeVariants,
  startChallenge,
  type ChallengeRoom,
} from "../src/game/ChallengeVariants";

function sourceRoom(): ChallengeRoom {
  return {
    id: "source-room",
    name: "Original room",
    width: 14,
    depth: 11,
    shape: "rectangle",
    items: [
      { id: "chair", kind: "chair", category: "seating", starter: true },
      { id: "lamp", kind: "lamp", category: "light", supportId: "desk", starter: true },
      { id: "desk", kind: "desk", category: "surface", starter: true },
    ],
  };
}

function ids() {
  let index = 0;
  return () => `challenge-${++index}`;
}

test("starting a challenge duplicates and remaps a room without mutating its source", () => {
  const source = sourceRoom();
  const before = structuredClone(source);
  const started = startChallenge("tiny-room", source, { idFactory: ids(), now: () => 100 });
  expect(source).toEqual(before);
  expect(started.room.id).not.toBe(source.id);
  expect(started.room).toMatchObject({ width: 10, depth: 8, metadata: { sourceRoomId: source.id } });
  expect(started.room.items.map((item) => item.id)).not.toEqual(source.items.map((item) => item.id));
  const copiedLamp = started.room.items.find((item) => item.kind === "lamp")!;
  const copiedDesk = started.room.items.find((item) => item.kind === "desk")!;
  expect(copiedLamp.supportId).toBe(copiedDesk.id);
  expect(started.introduction.rules.length).toBeGreaterThan(0);
  expect(started.introduction.reward.cosmeticOnly).toBe(true);
});

test("conditions explain progress, completion is sticky, and rewards claim once", () => {
  const started = startChallenge("five-things", sourceRoom(), { idFactory: ids(), now: () => 200 });
  started.room.items.push(
    { id: "extra-1", kind: "plant" },
    { id: "extra-2", kind: "rug" },
    { id: "extra-3", kind: "books" },
  );
  const tooMany = started.session.evaluate(started.room);
  expect(tooMany.complete).toBe(false);
  expect(tooMany.conditions[0]).toMatchObject({
    complete: false,
    current: 6,
    target: "2–5",
  });
  expect(tooMany.conditions[0].message).toContain("Remove 1 thing");
  started.room.items.pop();
  expect(started.session.evaluate(started.room).complete).toBe(true);
  expect(started.session.claimReward(started.room)?.cosmeticOnly).toBe(true);
  expect(started.session.claimReward(started.room)).toBeUndefined();
  started.room.items.splice(0);
  expect(started.session.evaluate(started.room).complete).toBe(true);
});

test("reuse, palette alternatives, abandonment, and free continuation are non-punitive", () => {
  const reuse = startChallenge("reuse-starter", sourceRoom(), { idFactory: ids() });
  let progress = reuse.session.evaluate(reuse.room);
  expect(progress.conditions.find((condition) => condition.id === "new-item")?.complete).toBe(false);
  reuse.room.items.push({ id: "new-local", kind: "plant" });
  progress = reuse.session.evaluate(reuse.room);
  expect(progress.complete).toBe(true);
  const requiredId = reuse.session.serialize().requiredStarterIds[0];
  reuse.room.items = reuse.room.items.filter((item) => item.id !== requiredId);
  const lostStarter = reuse.session.evaluate(reuse.room);
  expect(lostStarter.conditions.find((condition) => condition.id === "starter-items")?.message).toContain("Restore 1 starter item");

  const palette = startChallenge("one-palette", sourceRoom(), { idFactory: ids() });
  palette.room.items.forEach((item) => {
    item.materialFamily = "oak";
    item.color = undefined;
  });
  expect(palette.session.evaluate(palette.room).complete).toBe(true);

  const abandoned = startChallenge("photo-challenge", sourceRoom(), { idFactory: ids() });
  expect(abandoned.session.abandon().status).toBe("abandoned");
  expect(abandoned.session.continueFreely().status).toBe("sandbox");
});

test("all repeatable variants disclose explicit rules and rewards", () => {
  const variants = listChallengeVariants();
  expect(variants).toHaveLength(6);
  const sharedIds = ids();
  for (const variant of variants) {
    expect(variant.rules.length).toBeGreaterThan(0);
    expect(variant.reward).toMatchObject({ cosmeticOnly: true });
    const first = startChallenge(variant.id, sourceRoom(), { idFactory: sharedIds });
    const second = startChallenge(variant.id, sourceRoom(), { idFactory: sharedIds });
    expect(first.room.id).not.toBe(second.room.id);
  }
});
