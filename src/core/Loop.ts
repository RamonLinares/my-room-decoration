export class Loop {
  private frameId = 0;
  private lastTime = 0;
  private running = false;
  private workMs = 0;

  constructor(
    private readonly update: (deltaSeconds: number, elapsedSeconds: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  get lastWorkMs(): number {
    return this.workMs;
  }

  private readonly tick = (time: number) => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    const workStartedAt = performance.now();
    this.update(deltaSeconds, time / 1000);
    this.render();
    this.workMs = performance.now() - workStartedAt;
    this.frameId = requestAnimationFrame(this.tick);
  };
}
