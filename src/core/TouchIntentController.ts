export type TouchIntent = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  movementActive: boolean;
  lookActive: boolean;
  source: 'joystick' | 'dpad' | null;
};

export type DirectionButtons = {
  up: HTMLElement;
  right: HTMLElement;
  down: HTMLElement;
  left: HTMLElement;
};

export type TouchIntentControllerOptions = {
  movementZone: HTMLElement;
  lookZone?: HTMLElement;
  knob?: HTMLElement;
  dpad?: DirectionButtons;
  deadZone?: number;
  radius?: number;
  lookSensitivity?: number;
  floatingOrigin?: boolean;
};

type Point = { x: number; y: number };

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
} as const;

type Direction = keyof typeof DIRECTION_VECTORS;

const BUTTON_LABELS: Record<Direction, string> = {
  up: 'Move forward',
  right: 'Move right',
  down: 'Move backward',
  left: 'Move left',
};

export class TouchIntentController {
  private readonly deadZone: number;
  private readonly lookSensitivity: number;
  private movementPointerId: number | null = null;
  private lookPointerId: number | null = null;
  private movementOrigin: Point = { x: 0, y: 0 };
  private lookLast: Point = { x: 0, y: 0 };
  private movementRadius = 1;
  private joystickX = 0;
  private joystickY = 0;
  private moveX = 0;
  private moveY = 0;
  private lookX = 0;
  private lookY = 0;
  private readonly dpadPointers = new Map<number, Direction>();
  private readonly dpadKeys = new Set<Direction>();
  private disposed = false;

  private readonly onMovementDown = (event: PointerEvent) => {
    if (this.movementPointerId !== null || event.button > 0) return;
    event.preventDefault();
    const rect = this.options.movementZone.getBoundingClientRect();
    this.movementPointerId = event.pointerId;
    this.movementRadius = Math.max(
      1,
      this.options.radius ?? Math.min(rect.width, rect.height) * 0.42,
    );
    this.movementOrigin = this.options.floatingOrigin === false
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: event.clientX, y: event.clientY };
    this.capture(this.options.movementZone, event.pointerId);
    this.updateMovement(event.clientX, event.clientY);
  };

  private readonly onMovementMove = (event: PointerEvent) => {
    if (event.pointerId !== this.movementPointerId) return;
    event.preventDefault();
    this.updateMovement(event.clientX, event.clientY);
  };

  private readonly onMovementEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.movementPointerId) return;
    event.preventDefault();
    this.clearMovement();
  };

  private readonly onLookDown = (event: PointerEvent) => {
    if (this.lookPointerId !== null || event.button > 0) return;
    event.preventDefault();
    this.lookPointerId = event.pointerId;
    this.lookLast = { x: event.clientX, y: event.clientY };
    this.capture(this.options.lookZone, event.pointerId);
  };

  private readonly onLookMove = (event: PointerEvent) => {
    if (event.pointerId !== this.lookPointerId) return;
    event.preventDefault();
    this.lookX += (event.clientX - this.lookLast.x) * this.lookSensitivity;
    this.lookY += (event.clientY - this.lookLast.y) * this.lookSensitivity;
    this.lookLast = { x: event.clientX, y: event.clientY };
  };

  private readonly onLookEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.lookPointerId) return;
    event.preventDefault();
    this.lookPointerId = null;
  };

  private readonly onWindowPointerEnd = (event: PointerEvent) => {
    if (event.pointerId === this.movementPointerId) this.clearMovement();
    if (event.pointerId === this.lookPointerId) this.lookPointerId = null;
    if (this.dpadPointers.delete(event.pointerId)) this.updateDpadMovement();
  };

  private readonly reset = () => this.releaseAll();

  private readonly onVisibilityChange = () => {
    if (document.hidden) this.releaseAll();
  };

  constructor(private readonly options: TouchIntentControllerOptions) {
    this.deadZone = Math.min(0.95, Math.max(0, options.deadZone ?? 0.12));
    this.lookSensitivity = Math.max(0, options.lookSensitivity ?? 0.004);
    options.movementZone.addEventListener('pointerdown', this.onMovementDown);
    options.movementZone.addEventListener('pointermove', this.onMovementMove);
    options.movementZone.addEventListener('pointerup', this.onMovementEnd);
    options.movementZone.addEventListener('pointercancel', this.onMovementEnd);
    options.movementZone.addEventListener('lostpointercapture', this.onMovementEnd);
    options.lookZone?.addEventListener('pointerdown', this.onLookDown);
    options.lookZone?.addEventListener('pointermove', this.onLookMove);
    options.lookZone?.addEventListener('pointerup', this.onLookEnd);
    options.lookZone?.addEventListener('pointercancel', this.onLookEnd);
    options.lookZone?.addEventListener('lostpointercapture', this.onLookEnd);
    window.addEventListener('pointerup', this.onWindowPointerEnd, true);
    window.addEventListener('pointercancel', this.onWindowPointerEnd, true);
    window.addEventListener('blur', this.reset);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (options.dpad) this.bindDpad(options.dpad);
    this.applyTouchAction(options.movementZone);
    if (options.lookZone) this.applyTouchAction(options.lookZone);
  }

  read(): TouchIntent {
    const usingDpad = this.dpadPointers.size > 0 || this.dpadKeys.size > 0;
    return {
      moveX: this.moveX,
      moveY: this.moveY,
      lookX: this.lookX,
      lookY: this.lookY,
      movementActive: this.movementPointerId !== null || usingDpad,
      lookActive: this.lookPointerId !== null,
      source: usingDpad ? 'dpad' : this.movementPointerId !== null ? 'joystick' : null,
    };
  }

  consumeLookDelta(target: Point = { x: 0, y: 0 }): Point {
    target.x = this.lookX;
    target.y = this.lookY;
    this.lookX = 0;
    this.lookY = 0;
    return target;
  }

  releaseAll(): void {
    this.clearMovement();
    this.lookPointerId = null;
    this.lookX = 0;
    this.lookY = 0;
    this.dpadPointers.clear();
    this.dpadKeys.clear();
    this.updateDpadMovement();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseAll();
    const { movementZone, lookZone, dpad } = this.options;
    movementZone.removeEventListener('pointerdown', this.onMovementDown);
    movementZone.removeEventListener('pointermove', this.onMovementMove);
    movementZone.removeEventListener('pointerup', this.onMovementEnd);
    movementZone.removeEventListener('pointercancel', this.onMovementEnd);
    movementZone.removeEventListener('lostpointercapture', this.onMovementEnd);
    lookZone?.removeEventListener('pointerdown', this.onLookDown);
    lookZone?.removeEventListener('pointermove', this.onLookMove);
    lookZone?.removeEventListener('pointerup', this.onLookEnd);
    lookZone?.removeEventListener('pointercancel', this.onLookEnd);
    lookZone?.removeEventListener('lostpointercapture', this.onLookEnd);
    window.removeEventListener('pointerup', this.onWindowPointerEnd, true);
    window.removeEventListener('pointercancel', this.onWindowPointerEnd, true);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (dpad) this.unbindDpad(dpad);
  }

  private bindDpad(buttons: DirectionButtons): void {
    for (const direction of Object.keys(DIRECTION_VECTORS) as Direction[]) {
      const button = buttons[direction];
      button.dataset.touchDirection = direction;
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', BUTTON_LABELS[direction]);
      button.addEventListener('pointerdown', this.onDpadDown);
      button.addEventListener('pointerup', this.onDpadEnd);
      button.addEventListener('pointercancel', this.onDpadEnd);
      button.addEventListener('lostpointercapture', this.onDpadEnd);
      button.addEventListener('keydown', this.onDpadKeyDown);
      button.addEventListener('keyup', this.onDpadKeyUp);
      this.applyTouchAction(button);
    }
  }

  private unbindDpad(buttons: DirectionButtons): void {
    for (const direction of Object.keys(DIRECTION_VECTORS) as Direction[]) {
      const button = buttons[direction];
      button.removeEventListener('pointerdown', this.onDpadDown);
      button.removeEventListener('pointerup', this.onDpadEnd);
      button.removeEventListener('pointercancel', this.onDpadEnd);
      button.removeEventListener('lostpointercapture', this.onDpadEnd);
      button.removeEventListener('keydown', this.onDpadKeyDown);
      button.removeEventListener('keyup', this.onDpadKeyUp);
    }
  }

  private readonly onDpadDown = (event: PointerEvent) => {
    if (event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget as HTMLElement;
    const direction = element.dataset.touchDirection as Direction;
    this.dpadPointers.set(event.pointerId, direction);
    this.capture(element, event.pointerId);
    this.updateDpadMovement();
  };

  private readonly onDpadEnd = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.dpadPointers.delete(event.pointerId)) this.updateDpadMovement();
  };

  private readonly onDpadKeyDown = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    const direction = (event.currentTarget as HTMLElement).dataset.touchDirection as Direction;
    this.dpadKeys.add(direction);
    this.updateDpadMovement();
  };

  private readonly onDpadKeyUp = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    const direction = (event.currentTarget as HTMLElement).dataset.touchDirection as Direction;
    this.dpadKeys.delete(direction);
    this.updateDpadMovement();
  };

  private updateMovement(clientX: number, clientY: number): void {
    const rawX = (clientX - this.movementOrigin.x) / this.movementRadius;
    const rawY = (clientY - this.movementOrigin.y) / this.movementRadius;
    const length = Math.hypot(rawX, rawY);
    if (length <= this.deadZone) {
      this.joystickX = 0;
      this.joystickY = 0;
    } else {
      const normalizedLength = Math.min(1, (length - this.deadZone) / (1 - this.deadZone));
      this.joystickX = (rawX / length) * normalizedLength;
      this.joystickY = (rawY / length) * normalizedLength;
    }
    this.updateCombinedMovement();
    this.updateKnob();
  }

  private updateDpadMovement(): void {
    this.updateCombinedMovement();
  }

  private updateCombinedMovement(): void {
    let x = 0;
    let y = 0;
    for (const direction of [...this.dpadPointers.values(), ...this.dpadKeys]) {
      x += DIRECTION_VECTORS[direction].x;
      y += DIRECTION_VECTORS[direction].y;
    }
    if (this.dpadPointers.size === 0 && this.dpadKeys.size === 0) {
      x = this.joystickX;
      y = this.joystickY;
    }
    const length = Math.hypot(x, y);
    this.moveX = length > 1 ? x / length : x;
    this.moveY = length > 1 ? y / length : y;
  }

  private clearMovement(): void {
    this.movementPointerId = null;
    this.joystickX = 0;
    this.joystickY = 0;
    this.updateCombinedMovement();
    this.updateKnob();
  }

  private updateKnob(): void {
    if (!this.options.knob) return;
    const x = this.joystickX * this.movementRadius;
    const y = this.joystickY * this.movementRadius;
    this.options.knob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.options.knob.dataset.active = String(this.movementPointerId !== null);
  }

  private capture(element: HTMLElement | undefined, pointerId: number): void {
    if (!element) return;
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Synthetic pointer events and detached nodes may not be capturable.
    }
  }

  private applyTouchAction(element: HTMLElement): void {
    if (!element.style.touchAction) element.style.touchAction = 'none';
  }
}
