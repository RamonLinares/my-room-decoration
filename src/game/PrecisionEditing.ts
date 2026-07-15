export const PRECISION_EDITING_VERSION = 1;

export type PrecisionVector = { x: number; y: number; z: number };

export type PrecisionTransform = {
  position: PrecisionVector;
  rotationY: number;
  scale: number;
};

export type PrecisionObject = {
  id: string;
  kind: string;
  name: string;
  transform: PrecisionTransform;
  dimensions: PrecisionVector;
  locked?: boolean;
  hidden?: boolean;
  layerId?: string;
  groupId?: string;
  supportId?: string;
  payload?: Record<string, unknown>;
};

export type PrecisionGroup = { id: string; name: string; objectIds: string[] };
export type PrecisionLayer = { id: string; name: string; locked: boolean; hidden: boolean };
export type CameraBookmark = {
  id: string;
  name: string;
  position: PrecisionVector;
  target: PrecisionVector;
  fov: number;
};

export type PrecisionEditingState = {
  version: number;
  objects: Record<string, PrecisionObject>;
  selectedIds: string[];
  groups: Record<string, PrecisionGroup>;
  layers: Record<string, PrecisionLayer>;
  bookmarks: Record<string, CameraBookmark>;
  gridIncrement: number;
};

export type PrecisionClipboard = {
  version: number;
  objects: PrecisionObject[];
  groups: PrecisionGroup[];
};

export type PrecisionEditingOptions = {
  gridIncrement?: number;
  historyLimit?: number;
  idFactory?: () => string;
};

export type PrecisionCommandResult = {
  label: string;
  affectedIds: string[];
  state: PrecisionEditingState;
};

export type Measurement = PrecisionVector & { distance: number; label: string };

export type PrecisionErrorCode =
  | "empty-selection"
  | "invalid-clipboard"
  | "invalid-number"
  | "locked"
  | "not-found"
  | "too-few-objects";

export class PrecisionEditingError extends Error {
  constructor(
    readonly code: PrecisionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PrecisionEditingError";
  }
}

type HistoryEntry = {
  label: string;
  before: PrecisionEditingState;
  after: PrecisionEditingState;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new PrecisionEditingError("invalid-number", `${label} must be a finite number.`);
  }
  return value;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function cleanName(value: string, fallback: string): string {
  return value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 60) || fallback;
}

export class PrecisionEditingSession {
  private state: PrecisionEditingState;
  private readonly idFactory: () => string;
  private readonly historyLimit: number;
  private readonly issuedIds = new Set<string>();
  private history: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private clipboard?: PrecisionClipboard;
  private repeatTemplate?: PrecisionClipboard;
  private repeatCount = 0;

  constructor(objects: readonly PrecisionObject[], options: PrecisionEditingOptions = {}) {
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.historyLimit = Math.max(1, Math.floor(options.historyLimit ?? 100));
    const objectMap: Record<string, PrecisionObject> = {};
    objects.forEach((object) => {
      if (!object.id || objectMap[object.id]) {
        throw new PrecisionEditingError("invalid-clipboard", "Every object needs a unique ID.");
      }
      objectMap[object.id] = this.normalizeObject(object);
      this.issuedIds.add(object.id);
    });
    this.state = {
      version: PRECISION_EDITING_VERSION,
      objects: objectMap,
      selectedIds: [],
      groups: {},
      layers: {},
      bookmarks: {},
      gridIncrement: this.validateGrid(options.gridIncrement ?? 0.1),
    };
  }

  getState(): PrecisionEditingState {
    return clone(this.state);
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  select(ids: readonly string[], options: { additive?: boolean; includeGroups?: boolean } = {}): string[] {
    const requested = ids.filter((id) => this.state.objects[id] && !this.isHidden(id));
    const expanded = new Set(options.additive ? this.state.selectedIds : []);
    requested.forEach((id) => {
      expanded.add(id);
      if (options.includeGroups) {
        const groupId = this.state.objects[id].groupId;
        this.state.groups[groupId ?? ""]?.objectIds.forEach((member) => expanded.add(member));
      }
    });
    this.state.selectedIds = [...expanded].filter((id) => this.state.objects[id] && !this.isHidden(id));
    return [...this.state.selectedIds];
  }

  clearSelection(): void {
    this.state.selectedIds = [];
  }

  setGridIncrement(meters: number): PrecisionCommandResult {
    return this.commit("Change grid increment", [], (draft) => {
      draft.gridIncrement = this.validateGrid(meters);
    });
  }

  translateSelection(delta: Partial<PrecisionVector>, snap = true): PrecisionCommandResult {
    const ids = this.editableSelection();
    const movement = {
      x: finite(delta.x ?? 0, "X movement"),
      y: finite(delta.y ?? 0, "Y movement"),
      z: finite(delta.z ?? 0, "Z movement"),
    };
    return this.commit("Move selection", ids, (draft) => {
      ids.forEach((id) => {
        const position = draft.objects[id].transform.position;
        position.x = this.snap(position.x + movement.x, draft.gridIncrement, snap);
        position.y = this.snap(position.y + movement.y, draft.gridIncrement, snap);
        position.z = this.snap(position.z + movement.z, draft.gridIncrement, snap);
      });
    });
  }

  rotateSelection(radians: number): PrecisionCommandResult {
    const ids = this.editableSelection();
    const angle = finite(radians, "Rotation");
    const center = this.selectionCenter(ids);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return this.commit("Rotate selection", ids, (draft) => {
      ids.forEach((id) => {
        const object = draft.objects[id];
        const dx = object.transform.position.x - center.x;
        const dz = object.transform.position.z - center.z;
        object.transform.position.x = center.x + dx * cos - dz * sin;
        object.transform.position.z = center.z + dx * sin + dz * cos;
        object.transform.rotationY += angle;
      });
    });
  }

  scaleSelection(factor: number): PrecisionCommandResult {
    const ids = this.editableSelection();
    const scaleFactor = finite(factor, "Scale factor");
    if (scaleFactor <= 0 || scaleFactor > 100) {
      throw new PrecisionEditingError("invalid-number", "Scale factor must be greater than 0 and no more than 100.");
    }
    const center = this.selectionCenter(ids);
    return this.commit("Scale selection", ids, (draft) => {
      ids.forEach((id) => {
        const object = draft.objects[id];
        object.transform.position.x = center.x + (object.transform.position.x - center.x) * scaleFactor;
        object.transform.position.y = center.y + (object.transform.position.y - center.y) * scaleFactor;
        object.transform.position.z = center.z + (object.transform.position.z - center.z) * scaleFactor;
        object.transform.scale = Math.max(0.01, object.transform.scale * scaleFactor);
      });
    });
  }

  setNumericTransform(
    objectId: string,
    patch: Omit<Partial<PrecisionTransform>, "position"> & { position?: Partial<PrecisionVector> },
  ): PrecisionCommandResult {
    this.assertEditable([objectId]);
    return this.commit("Enter numeric transform", [objectId], (draft) => {
      const transform = draft.objects[objectId].transform;
      if (patch.position) {
        if (patch.position.x !== undefined) transform.position.x = finite(patch.position.x, "X position");
        if (patch.position.y !== undefined) transform.position.y = finite(patch.position.y, "Y position");
        if (patch.position.z !== undefined) transform.position.z = finite(patch.position.z, "Z position");
      }
      if (patch.rotationY !== undefined) transform.rotationY = finite(patch.rotationY, "Rotation");
      if (patch.scale !== undefined) {
        const scale = finite(patch.scale, "Scale");
        if (scale <= 0 || scale > 100) {
          throw new PrecisionEditingError("invalid-number", "Scale must be greater than 0 and no more than 100.");
        }
        transform.scale = scale;
      }
    });
  }

  setNumericDimensions(objectId: string, patch: Partial<PrecisionVector>): PrecisionCommandResult {
    this.assertEditable([objectId]);
    return this.commit("Enter numeric dimensions", [objectId], (draft) => {
      const dimensions = draft.objects[objectId].dimensions;
      for (const axis of ["x", "y", "z"] as const) {
        if (patch[axis] === undefined) continue;
        const value = finite(patch[axis], `${axis.toUpperCase()} dimension`);
        if (value <= 0 || value > 100) {
          throw new PrecisionEditingError(
            "invalid-number",
            `${axis.toUpperCase()} dimension must be greater than 0 m and no more than 100 m.`,
          );
        }
        dimensions[axis] = value;
      }
    });
  }

  alignSelection(axis: "x" | "y" | "z", edge: "minimum" | "center" | "maximum" = "center"): PrecisionCommandResult {
    const ids = this.editableSelection(2);
    const values = ids.map((id) => this.edgeValue(this.state.objects[id], axis, edge));
    const target = edge === "minimum" ? Math.min(...values) : edge === "maximum" ? Math.max(...values) : values.reduce((a, b) => a + b, 0) / values.length;
    return this.commit(`Align ${axis.toUpperCase()}`, ids, (draft) => {
      ids.forEach((id) => {
        const object = draft.objects[id];
        const offset = this.edgeValue(object, axis, edge) - object.transform.position[axis];
        object.transform.position[axis] = target - offset;
      });
    });
  }

  distributeSelection(axis: "x" | "y" | "z"): PrecisionCommandResult {
    const ids = this.editableSelection(3).sort(
      (a, b) => this.state.objects[a].transform.position[axis] - this.state.objects[b].transform.position[axis],
    );
    const first = this.state.objects[ids[0]].transform.position[axis];
    const last = this.state.objects[ids[ids.length - 1]].transform.position[axis];
    const step = (last - first) / (ids.length - 1);
    return this.commit(`Distribute ${axis.toUpperCase()}`, ids, (draft) => {
      ids.forEach((id, index) => {
        draft.objects[id].transform.position[axis] = first + step * index;
      });
    });
  }

  setLocked(ids: readonly string[], locked: boolean): PrecisionCommandResult {
    const existing = this.existingIds(ids);
    return this.commit(locked ? "Lock objects" : "Unlock objects", existing, (draft) => {
      existing.forEach((id) => (draft.objects[id].locked = locked));
    });
  }

  setHidden(ids: readonly string[], hidden: boolean): PrecisionCommandResult {
    const existing = this.existingIds(ids);
    return this.commit(hidden ? "Hide objects" : "Show objects", existing, (draft) => {
      existing.forEach((id) => (draft.objects[id].hidden = hidden));
      if (hidden) draft.selectedIds = draft.selectedIds.filter((id) => !existing.includes(id));
    });
  }

  createGroup(name: string, ids = this.state.selectedIds): PrecisionCommandResult {
    const objectIds = this.existingIds(ids);
    if (objectIds.length < 2) {
      throw new PrecisionEditingError("too-few-objects", "Select at least two objects to create a group.");
    }
    const groupId = this.nextId();
    return this.commit("Create group", objectIds, (draft) => {
      draft.groups[groupId] = { id: groupId, name: cleanName(name, "Untitled group"), objectIds };
      objectIds.forEach((id) => {
        const oldGroup = draft.objects[id].groupId;
        if (oldGroup && draft.groups[oldGroup]) {
          draft.groups[oldGroup].objectIds = draft.groups[oldGroup].objectIds.filter((member) => member !== id);
          if (!draft.groups[oldGroup].objectIds.length) delete draft.groups[oldGroup];
        }
        draft.objects[id].groupId = groupId;
      });
    });
  }

  ungroup(groupId: string): PrecisionCommandResult {
    const group = this.state.groups[groupId];
    if (!group) throw new PrecisionEditingError("not-found", "Group not found.");
    return this.commit("Ungroup objects", group.objectIds, (draft) => {
      group.objectIds.forEach((id) => {
        if (draft.objects[id]?.groupId === groupId) delete draft.objects[id].groupId;
      });
      delete draft.groups[groupId];
    });
  }

  renameGroup(groupId: string, name: string): PrecisionCommandResult {
    if (!this.state.groups[groupId]) throw new PrecisionEditingError("not-found", "Group not found.");
    return this.commit("Rename group", this.state.groups[groupId].objectIds, (draft) => {
      draft.groups[groupId].name = cleanName(name, draft.groups[groupId].name);
    });
  }

  createLayer(name: string): PrecisionCommandResult {
    const layerId = this.nextId();
    return this.commit("Create layer", [], (draft) => {
      draft.layers[layerId] = {
        id: layerId,
        name: cleanName(name, "Untitled layer"),
        locked: false,
        hidden: false,
      };
    });
  }

  assignToLayer(layerId: string, ids = this.state.selectedIds): PrecisionCommandResult {
    if (!this.state.layers[layerId]) throw new PrecisionEditingError("not-found", "Layer not found.");
    const objectIds = this.existingIds(ids);
    return this.commit("Assign layer", objectIds, (draft) => {
      objectIds.forEach((id) => (draft.objects[id].layerId = layerId));
    });
  }

  updateLayer(layerId: string, patch: Partial<Pick<PrecisionLayer, "name" | "locked" | "hidden">>): PrecisionCommandResult {
    if (!this.state.layers[layerId]) throw new PrecisionEditingError("not-found", "Layer not found.");
    return this.commit("Update layer", [], (draft) => {
      const layer = draft.layers[layerId];
      if (patch.name !== undefined) layer.name = cleanName(patch.name, layer.name);
      if (patch.locked !== undefined) layer.locked = patch.locked;
      if (patch.hidden !== undefined) {
        layer.hidden = patch.hidden;
        if (patch.hidden) {
          draft.selectedIds = draft.selectedIds.filter((id) => draft.objects[id].layerId !== layerId);
        }
      }
    });
  }

  copySelection(): PrecisionClipboard {
    const ids = this.selectionOrThrow();
    const idSet = new Set(ids);
    this.clipboard = {
      version: PRECISION_EDITING_VERSION,
      objects: ids.map((id) => clone(this.state.objects[id])),
      groups: Object.values(this.state.groups)
        .map((group) => ({ ...group, objectIds: group.objectIds.filter((id) => idSet.has(id)) }))
        .filter((group) => group.objectIds.length > 1),
    };
    return clone(this.clipboard);
  }

  importClipboard(clipboard: unknown): PrecisionClipboard {
    if (!clipboard || typeof clipboard !== "object") {
      throw new PrecisionEditingError("invalid-clipboard", "Clipboard data is invalid.");
    }
    const value = clipboard as Partial<PrecisionClipboard>;
    if (value.version !== PRECISION_EDITING_VERSION || !Array.isArray(value.objects)) {
      throw new PrecisionEditingError("invalid-clipboard", "Clipboard version is unsupported.");
    }
    const ids = new Set<string>();
    const objects = value.objects.map((object) => {
      if (!object?.id || ids.has(object.id)) {
        throw new PrecisionEditingError("invalid-clipboard", "Clipboard object IDs must be unique.");
      }
      ids.add(object.id);
      return this.normalizeObject(object);
    });
    this.clipboard = {
      version: PRECISION_EDITING_VERSION,
      objects,
      groups: Array.isArray(value.groups) ? clone(value.groups) : [],
    };
    return clone(this.clipboard);
  }

  paste(offset: Partial<PrecisionVector> = { x: 0.25, z: 0.25 }): PrecisionCommandResult {
    if (!this.clipboard?.objects.length) {
      throw new PrecisionEditingError("invalid-clipboard", "Copy one or more objects before pasting.");
    }
    return this.insertClipboard(this.clipboard, offset, "Paste objects");
  }

  duplicateSelection(offset: Partial<PrecisionVector> = { x: 0.25, z: 0.25 }): PrecisionCommandResult {
    return this.insertClipboard(this.copySelection(), offset, "Duplicate selection");
  }

  beginRepeatPlacement(): void {
    this.repeatTemplate = this.copySelection();
    this.repeatCount = 0;
  }

  repeatPlacement(offset: Partial<PrecisionVector> = { x: 0.5, z: 0.5 }): PrecisionCommandResult {
    if (!this.repeatTemplate) {
      throw new PrecisionEditingError("invalid-clipboard", "Choose objects before starting repeated placement.");
    }
    this.repeatCount += 1;
    return this.insertClipboard(
      this.repeatTemplate,
      {
        x: (offset.x ?? 0) * this.repeatCount,
        y: (offset.y ?? 0) * this.repeatCount,
        z: (offset.z ?? 0) * this.repeatCount,
      },
      "Repeat placement",
    );
  }

  addCameraBookmark(name: string, camera: Omit<CameraBookmark, "id" | "name">): PrecisionCommandResult {
    this.validateVector(camera.position, "Camera position");
    this.validateVector(camera.target, "Camera target");
    const fov = finite(camera.fov, "Camera field of view");
    if (fov < 10 || fov > 120) {
      throw new PrecisionEditingError("invalid-number", "Camera field of view must be between 10 and 120 degrees.");
    }
    const id = this.nextId();
    return this.commit("Add camera bookmark", [], (draft) => {
      draft.bookmarks[id] = {
        id,
        name: cleanName(name, "Saved view"),
        position: clone(camera.position),
        target: clone(camera.target),
        fov,
      };
    });
  }

  removeCameraBookmark(id: string): PrecisionCommandResult {
    if (!this.state.bookmarks[id]) throw new PrecisionEditingError("not-found", "Camera bookmark not found.");
    return this.commit("Remove camera bookmark", [], (draft) => {
      delete draft.bookmarks[id];
    });
  }

  measure(a: PrecisionVector, b: PrecisionVector): Measurement {
    this.validateVector(a, "Start point");
    this.validateVector(b, "End point");
    const x = b.x - a.x;
    const y = b.y - a.y;
    const z = b.z - a.z;
    const distance = Math.hypot(x, y, z);
    return { x, y, z, distance, label: `${distance.toFixed(2)} m` };
  }

  undo(): PrecisionCommandResult | undefined {
    const entry = this.history.pop();
    if (!entry) return undefined;
    this.future.push(entry);
    this.state = clone(entry.before);
    return { label: `Undo ${entry.label}`, affectedIds: [], state: this.getState() };
  }

  redo(): PrecisionCommandResult | undefined {
    const entry = this.future.pop();
    if (!entry) return undefined;
    this.history.push(entry);
    this.state = clone(entry.after);
    return { label: `Redo ${entry.label}`, affectedIds: [], state: this.getState() };
  }

  private insertClipboard(
    clipboard: PrecisionClipboard,
    offset: Partial<PrecisionVector>,
    label: string,
  ): PrecisionCommandResult {
    const mapping = new Map<string, string>();
    clipboard.objects.forEach((object) => mapping.set(object.id, this.nextId()));
    const groupMapping = new Map<string, string>();
    clipboard.groups.forEach((group) => groupMapping.set(group.id, this.nextId()));
    const inserted = [...mapping.values()];
    return this.commit(label, inserted, (draft) => {
      clipboard.objects.forEach((source) => {
        const id = mapping.get(source.id)!;
        const object = clone(source);
        object.id = id;
        object.transform.position.x += finite(offset.x ?? 0, "X offset");
        object.transform.position.y += finite(offset.y ?? 0, "Y offset");
        object.transform.position.z += finite(offset.z ?? 0, "Z offset");
        object.supportId = source.supportId ? mapping.get(source.supportId) : undefined;
        object.groupId = source.groupId ? groupMapping.get(source.groupId) : undefined;
        draft.objects[id] = object;
      });
      clipboard.groups.forEach((source) => {
        const id = groupMapping.get(source.id)!;
        const objectIds = source.objectIds.flatMap((objectId) => {
          const mapped = mapping.get(objectId);
          return mapped ? [mapped] : [];
        });
        if (objectIds.length > 1) draft.groups[id] = { id, name: source.name, objectIds };
      });
      draft.selectedIds = inserted;
    });
  }

  private commit(
    label: string,
    affectedIds: readonly string[],
    mutate: (draft: PrecisionEditingState) => void,
  ): PrecisionCommandResult {
    const before = this.getState();
    const after = clone(before);
    mutate(after);
    this.state = after;
    this.history.push({ label, before, after: clone(after) });
    if (this.history.length > this.historyLimit) this.history.shift();
    this.future = [];
    return { label, affectedIds: [...affectedIds], state: this.getState() };
  }

  private normalizeObject(object: PrecisionObject): PrecisionObject {
    this.validateVector(object.transform.position, "Object position");
    this.validateVector(object.dimensions, "Object dimensions");
    finite(object.transform.rotationY, "Object rotation");
    if (!Number.isFinite(object.transform.scale) || object.transform.scale <= 0) {
      throw new PrecisionEditingError("invalid-number", "Object scale must be greater than 0.");
    }
    return clone(object);
  }

  private editableSelection(minimum = 1): string[] {
    const ids = this.selectionOrThrow(minimum);
    this.assertEditable(ids);
    return ids;
  }

  private selectionOrThrow(minimum = 1): string[] {
    const ids = this.existingIds(this.state.selectedIds);
    if (ids.length < minimum) {
      throw new PrecisionEditingError(
        minimum === 1 ? "empty-selection" : "too-few-objects",
        minimum === 1 ? "Select an object first." : `Select at least ${minimum} objects.`,
      );
    }
    return ids;
  }

  private assertEditable(ids: readonly string[]): void {
    const locked = ids.find((id) => {
      const object = this.state.objects[id];
      return object.locked || (object.layerId ? this.state.layers[object.layerId]?.locked : false);
    });
    if (locked) {
      throw new PrecisionEditingError("locked", `${this.state.objects[locked].name} is locked.`);
    }
  }

  private existingIds(ids: readonly string[]): string[] {
    return unique(ids).filter((id) => Boolean(this.state.objects[id]));
  }

  private isHidden(id: string): boolean {
    const object = this.state.objects[id];
    return Boolean(object.hidden || (object.layerId && this.state.layers[object.layerId]?.hidden));
  }

  private selectionCenter(ids: readonly string[]): PrecisionVector {
    const sum = ids.reduce(
      (result, id) => {
        const position = this.state.objects[id].transform.position;
        result.x += position.x;
        result.y += position.y;
        result.z += position.z;
        return result;
      },
      { x: 0, y: 0, z: 0 },
    );
    return { x: sum.x / ids.length, y: sum.y / ids.length, z: sum.z / ids.length };
  }

  private edgeValue(
    object: PrecisionObject,
    axis: "x" | "y" | "z",
    edge: "minimum" | "center" | "maximum",
  ): number {
    const center = object.transform.position[axis];
    if (edge === "center") return center;
    const half = (object.dimensions[axis] * object.transform.scale) / 2;
    return center + (edge === "minimum" ? -half : half);
  }

  private snap(value: number, increment: number, enabled: boolean): number {
    return enabled ? Math.round(value / increment) * increment : value;
  }

  private validateGrid(value: number): number {
    const grid = finite(value, "Grid increment");
    if (grid < 0.01 || grid > 10) {
      throw new PrecisionEditingError("invalid-number", "Grid increment must be between 0.01 m and 10 m.");
    }
    return grid;
  }

  private validateVector(value: PrecisionVector, label: string): void {
    finite(value.x, `${label} X`);
    finite(value.y, `${label} Y`);
    finite(value.z, `${label} Z`);
  }

  private nextId(): string {
    let id = this.idFactory();
    let attempts = 0;
    while (
      !id ||
      this.state.objects[id] ||
      this.state.groups[id] ||
      this.state.layers[id] ||
      this.state.bookmarks[id]
      || this.issuedIds.has(id)
    ) {
      if (++attempts > 100) throw new PrecisionEditingError("invalid-clipboard", "Could not create a unique ID.");
      id = this.idFactory();
    }
    this.issuedIds.add(id);
    return id;
  }
}
