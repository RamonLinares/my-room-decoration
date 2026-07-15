import { expect, test } from "@playwright/test";
import {
  PrecisionEditingError,
  PrecisionEditingSession,
  type PrecisionObject,
} from "../src/game/PrecisionEditing";

function object(id: string, x: number, z: number, supportId?: string): PrecisionObject {
  return {
    id,
    kind: id.startsWith("desk") ? "desk" : "chair",
    name: id,
    transform: { position: { x, y: supportId ? 1 : 0, z }, rotationY: 0, scale: 1 },
    dimensions: { x: 1, y: 1, z: 1 },
    supportId,
  };
}

function idFactory() {
  let index = 0;
  return () => `generated-${++index}`;
}

test("multi-select group transforms preserve relative placement and support links", () => {
  const session = new PrecisionEditingSession(
    [object("desk-1", 0, 0), object("monitor-1", 1, 0, "desk-1")],
    { idFactory: idFactory() },
  );
  session.select(["desk-1", "monitor-1"]);
  session.createGroup("Workspace");
  const grouped = session.getState();
  const groupId = grouped.objects["desk-1"].groupId!;
  expect(grouped.groups[groupId]).toMatchObject({ name: "Workspace" });

  session.translateSelection({ x: 1, z: 2 });
  session.rotateSelection(Math.PI / 2);
  const transformed = session.getState();
  expect(transformed.objects["monitor-1"].supportId).toBe("desk-1");
  expect(
    Math.hypot(
      transformed.objects["monitor-1"].transform.position.x - transformed.objects["desk-1"].transform.position.x,
      transformed.objects["monitor-1"].transform.position.z - transformed.objects["desk-1"].transform.position.z,
    ),
  ).toBeCloseTo(1);

  session.renameGroup(groupId, "Focused workspace");
  expect(session.getState().groups[groupId].name).toBe("Focused workspace");
  session.undo();
  expect(session.getState().groups[groupId].name).toBe("Workspace");
  session.redo();
  expect(session.getState().groups[groupId].name).toBe("Focused workspace");
});

test("locks, layers, grid, numeric transforms, alignment, and distribution are command based", () => {
  const session = new PrecisionEditingSession(
    [object("a", 0, 0), object("b", 1.2, 0), object("c", 4, 0)],
    { idFactory: idFactory(), gridIncrement: 0.25 },
  );
  session.select(["a", "b", "c"]);
  session.distributeSelection("x");
  expect(session.getState().objects.b.transform.position.x).toBe(2);
  session.alignSelection("z");
  session.translateSelection({ x: 0.3 });
  expect(session.getState().objects.a.transform.position.x).toBe(0.25);
  session.setNumericTransform("a", { position: { y: 1.25 }, rotationY: Math.PI, scale: 1.5 });
  session.setNumericDimensions("a", { x: 2.5, z: 0.75 });
  expect(session.getState().objects.a.transform).toMatchObject({
    position: { y: 1.25 },
    rotationY: Math.PI,
    scale: 1.5,
  });
  expect(session.getState().objects.a.dimensions).toMatchObject({ x: 2.5, z: 0.75 });

  session.createLayer("Architecture");
  const layerId = Object.keys(session.getState().layers)[0];
  session.assignToLayer(layerId, ["a"]);
  session.updateLayer(layerId, { locked: true });
  session.select(["a"]);
  expect(() => session.translateSelection({ x: 1 })).toThrow(PrecisionEditingError);
  session.updateLayer(layerId, { locked: false, hidden: true });
  expect(session.getState().selectedIds).toEqual([]);
});

test("clipboard, cross-room paste, repeated placement, bookmarks, and ruler are safe", () => {
  const source = new PrecisionEditingSession(
    [object("desk-1", 0, 0), object("monitor-1", 0, 0, "desk-1")],
    { idFactory: idFactory() },
  );
  source.select(["desk-1", "monitor-1"]);
  source.createGroup("Desk set");
  const clipboard = source.copySelection();

  const target = new PrecisionEditingSession([], { idFactory: idFactory() });
  target.importClipboard(clipboard);
  const pasted = target.paste({ x: 2, z: 1 });
  expect(pasted.affectedIds).toHaveLength(2);
  const state = target.getState();
  const pastedDesk = Object.values(state.objects).find((item) => item.kind === "desk")!;
  const pastedMonitor = Object.values(state.objects).find((item) => item.kind === "chair")!;
  expect(pastedMonitor.supportId).toBe(pastedDesk.id);
  expect(pastedDesk.id).not.toBe("desk-1");

  target.beginRepeatPlacement();
  const repeated = target.repeatPlacement({ x: 1 });
  expect(repeated.affectedIds).toHaveLength(2);
  expect(new Set(Object.keys(target.getState().objects)).size).toBe(4);
  expect(target.duplicateSelection({ z: 2 }).affectedIds).toHaveLength(2);

  target.addCameraBookmark("Doorway", {
    position: { x: 2, y: 2, z: 4 },
    target: { x: 0, y: 1, z: 0 },
    fov: 55,
  });
  expect(Object.values(target.getState().bookmarks)[0]).toMatchObject({ name: "Doorway", fov: 55 });
  expect(target.measure({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toMatchObject({
    distance: 5,
    label: "5.00 m",
  });
});

test("a 100-object precision operation remains bounded", () => {
  const objects = Array.from({ length: 100 }, (_, index) => object(`item-${index}`, index, 0));
  const session = new PrecisionEditingSession(objects);
  session.select(objects.map((item) => item.id));
  const started = performance.now();
  session.translateSelection({ z: 1 });
  expect(performance.now() - started).toBeLessThan(250);
  expect(Object.keys(session.getState().objects)).toHaveLength(100);
});
