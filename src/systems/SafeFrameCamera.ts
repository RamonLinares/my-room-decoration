import * as THREE from 'three';

export type SafeFrameInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type SafeFrameFitInput = {
  verticalFovDegrees: number;
  aspect: number;
  viewport: ViewportSize;
  insets?: Partial<SafeFrameInsets>;
  halfWidth: number;
  halfHeight: number;
  padding?: number;
  minDistance?: number;
  maxDistance?: number;
};

export type SafeFrameFit = {
  distance: number;
  horizontalFovRadians: number;
  verticalFovRadians: number;
  safeCenterNdc: THREE.Vector2;
  safeHalfSpanNdc: THREE.Vector2;
  safeViewport: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type CameraFocusPreset = {
  target: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
  safeCenterNdc?: THREE.Vector2;
  viewport?: ViewportSize;
};

export type BoxFocusOptions = {
  viewport: ViewportSize;
  insets?: Partial<SafeFrameInsets>;
  direction?: THREE.Vector3;
  up?: THREE.Vector3;
  padding?: number;
  minDistance?: number;
  maxDistance?: number;
  durationMs?: number;
  reducedMotion?: boolean;
};

export type PresetFocusOptions = {
  durationMs?: number;
  reducedMotion?: boolean;
};

export type SafeFrameCameraControllerOptions = {
  defaultDurationMs?: number;
  reducedMotion?: () => boolean;
  onTargetChange?: (target: THREE.Vector3) => void;
};

const EMPTY_INSETS: SafeFrameInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const EPSILON = 1e-5;

function normalizedDirection(value: THREE.Vector3): THREE.Vector3 {
  const direction = value.clone();
  if (direction.lengthSq() < EPSILON) direction.set(0, 0, 1);
  return direction.normalize();
}

function normalizedInsets(
  viewport: ViewportSize,
  value: Partial<SafeFrameInsets> = EMPTY_INSETS,
): SafeFrameInsets {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const left = THREE.MathUtils.clamp(value.left ?? 0, 0, width - 1);
  const right = THREE.MathUtils.clamp(value.right ?? 0, 0, width - left - 1);
  const top = THREE.MathUtils.clamp(value.top ?? 0, 0, height - 1);
  const bottom = THREE.MathUtils.clamp(value.bottom ?? 0, 0, height - top - 1);
  return { top, right, bottom, left };
}

export function safeFrameNdc(
  viewport: ViewportSize,
  insets?: Partial<SafeFrameInsets>,
): Pick<SafeFrameFit, 'safeCenterNdc' | 'safeHalfSpanNdc' | 'safeViewport'> {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const safe = normalizedInsets({ width, height }, insets);
  const safeWidth = Math.max(1, width - safe.left - safe.right);
  const safeHeight = Math.max(1, height - safe.top - safe.bottom);
  const centerX = safe.left + safeWidth / 2;
  const centerY = safe.top + safeHeight / 2;

  return {
    safeCenterNdc: new THREE.Vector2(
      (centerX / width) * 2 - 1,
      1 - (centerY / height) * 2,
    ),
    safeHalfSpanNdc: new THREE.Vector2(safeWidth / width, safeHeight / height),
    safeViewport: {
      left: safe.left,
      top: safe.top,
      width: safeWidth,
      height: safeHeight,
    },
  };
}

export function calculateSafeFrameFit(input: SafeFrameFitInput): SafeFrameFit {
  const verticalFovRadians = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(input.verticalFovDegrees, 1, 179),
  );
  const aspect = Math.max(EPSILON, input.aspect);
  const horizontalFovRadians = 2 * Math.atan(Math.tan(verticalFovRadians / 2) * aspect);
  const safeFrame = safeFrameNdc(input.viewport, input.insets);
  const padding = Math.max(1, input.padding ?? 1.08);
  const verticalTangent = Math.tan(verticalFovRadians / 2);
  const horizontalTangent = Math.tan(horizontalFovRadians / 2);
  const widthDistance =
    (Math.max(0, input.halfWidth) * padding) /
    Math.max(EPSILON, horizontalTangent * safeFrame.safeHalfSpanNdc.x);
  const heightDistance =
    (Math.max(0, input.halfHeight) * padding) /
    Math.max(EPSILON, verticalTangent * safeFrame.safeHalfSpanNdc.y);
  const minDistance = Math.max(EPSILON, input.minDistance ?? EPSILON);
  const maxDistance = Math.max(minDistance, input.maxDistance ?? Number.POSITIVE_INFINITY);

  return {
    ...safeFrame,
    distance: THREE.MathUtils.clamp(
      Math.max(widthDistance, heightDistance, minDistance),
      minDistance,
      maxDistance,
    ),
    horizontalFovRadians,
    verticalFovRadians,
  };
}

export function boxViewHalfExtents(
  box: THREE.Box3,
  direction: THREE.Vector3,
  up = new THREE.Vector3(0, 1, 0),
): { halfWidth: number; halfHeight: number; depth: number } {
  if (box.isEmpty()) return { halfWidth: 0, halfHeight: 0, depth: 0 };
  const forward = normalizedDirection(direction);
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  if (right.lengthSq() < EPSILON) right.set(1, 0, 0);
  const viewUp = new THREE.Vector3().crossVectors(right, forward).normalize();
  const center = box.getCenter(new THREE.Vector3());
  let halfWidth = 0;
  let halfHeight = 0;
  let depth = 0;

  for (let mask = 0; mask < 8; mask += 1) {
    const corner = new THREE.Vector3(
      mask & 1 ? box.max.x : box.min.x,
      mask & 2 ? box.max.y : box.min.y,
      mask & 4 ? box.max.z : box.min.z,
    ).sub(center);
    halfWidth = Math.max(halfWidth, Math.abs(corner.dot(right)));
    halfHeight = Math.max(halfHeight, Math.abs(corner.dot(viewUp)));
    depth = Math.max(depth, Math.abs(corner.dot(forward)));
  }

  return { halfWidth, halfHeight, depth };
}

export function createSafeFramePreset(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  options: BoxFocusOptions,
): CameraFocusPreset {
  const target = box.getCenter(new THREE.Vector3());
  const direction = normalizedDirection(
    options.direction ?? new THREE.Vector3(1, -0.7, 1),
  );
  const up = (options.up ?? camera.up).clone().normalize();
  const extents = boxViewHalfExtents(box, direction, up);
  const fit = calculateSafeFrameFit({
    verticalFovDegrees: camera.fov,
    aspect: camera.aspect,
    viewport: options.viewport,
    insets: options.insets,
    halfWidth: extents.halfWidth,
    halfHeight: extents.halfHeight,
    padding: options.padding,
    minDistance: camera.near,
  });

  const minDistance = Math.max(camera.near, options.minDistance ?? camera.near);
  const maxDistance = Math.max(
    minDistance,
    options.maxDistance ?? Number.POSITIVE_INFINITY,
  );
  const distance = THREE.MathUtils.clamp(
    fit.distance + extents.depth,
    minDistance,
    maxDistance,
  );

  return {
    target,
    direction,
    distance,
    safeCenterNdc: fit.safeCenterNdc,
    viewport: options.viewport,
  };
}

function cameraPoseForPreset(
  preset: CameraFocusPreset,
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const position = preset.target
    .clone()
    .addScaledVector(normalizedDirection(preset.direction), preset.distance);
  return { position, lookAt: preset.target.clone() };
}

export class SafeFrameCameraController {
  private readonly startPosition = new THREE.Vector3();
  private readonly startQuaternion = new THREE.Quaternion();
  private readonly endPosition = new THREE.Vector3();
  private readonly endQuaternion = new THREE.Quaternion();
  private readonly activeTarget = new THREE.Vector3();
  private elapsedMs = 0;
  private durationMs = 0;
  private transitioning = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly options: SafeFrameCameraControllerOptions = {},
  ) {}

  focusBox(box: THREE.Box3, options: BoxFocusOptions): CameraFocusPreset {
    const preset = createSafeFramePreset(this.camera, box, options);
    this.focusPreset(preset, options);
    return preset;
  }

  focusPreset(preset: CameraFocusPreset, options: PresetFocusOptions = {}): void {
    this.applySafeFrameViewOffset(preset);
    const pose = cameraPoseForPreset(preset);
    const lookMatrix = new THREE.Matrix4().lookAt(pose.position, pose.lookAt, this.camera.up);
    const reducedMotion = options.reducedMotion ?? this.options.reducedMotion?.() ?? false;
    this.activeTarget.copy(preset.target);
    this.options.onTargetChange?.(this.activeTarget.clone());

    if (reducedMotion || (options.durationMs ?? this.options.defaultDurationMs ?? 420) <= 0) {
      this.camera.position.copy(pose.position);
      this.camera.quaternion.setFromRotationMatrix(lookMatrix);
      this.transitioning = false;
      this.camera.updateMatrixWorld();
      return;
    }

    this.startPosition.copy(this.camera.position);
    this.startQuaternion.copy(this.camera.quaternion);
    this.endPosition.copy(pose.position);
    this.endQuaternion.setFromRotationMatrix(lookMatrix);
    this.elapsedMs = 0;
    this.durationMs = options.durationMs ?? this.options.defaultDurationMs ?? 420;
    this.transitioning = true;
  }

  update(deltaSeconds: number): boolean {
    if (!this.transitioning) return false;
    this.elapsedMs += Math.max(0, deltaSeconds) * 1000;
    const linear = THREE.MathUtils.clamp(this.elapsedMs / this.durationMs, 0, 1);
    const eased = linear * linear * (3 - 2 * linear);
    this.camera.position.lerpVectors(this.startPosition, this.endPosition, eased);
    this.camera.quaternion.slerpQuaternions(this.startQuaternion, this.endQuaternion, eased);
    this.camera.updateMatrixWorld();
    if (linear >= 1) this.transitioning = false;
    return this.transitioning;
  }

  cancel(): void {
    this.transitioning = false;
  }

  clearSafeFrameOffset(): void {
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  getTarget(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.activeTarget);
  }

  private applySafeFrameViewOffset(preset: CameraFocusPreset): void {
    const center = preset.safeCenterNdc;
    const viewport = preset.viewport;
    if (!center || !viewport || (Math.abs(center.x) < EPSILON && Math.abs(center.y) < EPSILON)) {
      this.clearSafeFrameOffset();
      return;
    }
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.camera.setViewOffset(
      width,
      height,
      (-center.x * width) / 2,
      (center.y * height) / 2,
      width,
      height,
    );
    this.camera.updateProjectionMatrix();
  }
}
