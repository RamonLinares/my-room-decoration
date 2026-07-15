import { expect, test } from "@playwright/test";
import {
  SUPPORTED_WALK_KINDS,
  WalkInteractionEngine,
} from "../src/game/WalkInteractions";

test("Walk interactions support a broad meaningful catalog and deterministic cooldown", () => {
  let now = 1_000;
  const engine = new WalkInteractionEngine({ cooldownMs: 300, now: () => now });
  expect(SUPPORTED_WALK_KINDS.length).toBeGreaterThanOrEqual(12);
  expect(WalkInteractionEngine.supports("lamp")).toBe(true);
  expect(WalkInteractionEngine.supports("wardrobe")).toBe(true);
  expect(WalkInteractionEngine.supports("armchair")).toBe(true);
  expect(WalkInteractionEngine.supports("radio")).toBe(true);
  expect(WalkInteractionEngine.supports("teddy")).toBe(true);

  const light = { id: "lamp-1", kind: "lamp", name: "Honey lamp" };
  expect(engine.getPrompt(light)).toMatchObject({ actionLabel: "Switch on", state: "off" });
  expect(engine.interact(light)).toMatchObject({ status: "applied", prompt: { state: "on" } });
  expect(engine.interact(light)).toMatchObject({ status: "cooldown", changes: [] });
  now += 300;
  expect(engine.interact(light)).toMatchObject({ status: "applied", prompt: { state: "off" } });
});

test("seating and music are exclusive and state round-trips safely", () => {
  let now = 10_000;
  const engine = new WalkInteractionEngine({ cooldownMs: 0, now: () => now++ });
  engine.interact({ id: "chair-1", kind: "chair" });
  const secondSeat = engine.interact({ id: "sofa-1", kind: "sofa" });
  expect(secondSeat.status).toBe("applied");
  if (secondSeat.status === "applied") {
    expect(secondSeat.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectId: "chair-1", previous: "seated", state: "idle" }),
        expect.objectContaining({ objectId: "sofa-1", state: "seated" }),
      ]),
    );
  }
  engine.interact({ id: "radio-1", kind: "radio" });
  engine.interact({ id: "record-1", kind: "record" });
  engine.interact({ id: "bear-1", kind: "teddy" });

  const restored = new WalkInteractionEngine({ cooldownMs: 0, initialState: engine.serialize() });
  expect(restored.getPrompt({ id: "chair-1", kind: "chair" })?.state).toBe("idle");
  expect(restored.getPrompt({ id: "sofa-1", kind: "sofa" })?.state).toBe("seated");
  expect(restored.getPrompt({ id: "radio-1", kind: "radio" })?.state).toBe("stopped");
  expect(restored.getPrompt({ id: "record-1", kind: "record" })?.state).toBe("playing");
  expect(restored.getPrompt({ id: "bear-1", kind: "teddy" })?.actionLabel).toBe("Look again");
  expect(restored.interact({ id: "unknown", kind: "books" }).status).toBe("unsupported");
});

test("invalid restored states are ignored instead of poisoning room saves", () => {
  const engine = new WalkInteractionEngine({
    initialState: {
      version: 1,
      objects: {
        wrongFamily: { kind: "lamp", state: "playing", lastInteractedAt: 10 },
        unknown: { kind: "not-real", state: "on", lastInteractedAt: 10 },
        valid: { kind: "wardrobe", state: "open", lastInteractedAt: 10 },
      },
      activeMusicId: "wrongFamily",
    },
  });
  expect(engine.serialize().objects).toEqual({
    valid: { kind: "wardrobe", state: "open", lastInteractedAt: 10 },
  });
});
