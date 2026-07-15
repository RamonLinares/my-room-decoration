export type PhotoQuality = 'standard' | 'high';

export type PhotoCaptureRequest = {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
  quality: PhotoQuality;
  memoryBudgetBytes?: number;
};

export type PhotoFallbackReason =
  | 'recent-context-loss'
  | 'recent-out-of-memory'
  | 'memory-budget-quality'
  | 'memory-budget-samples'
  | 'memory-budget-resolution';

export type PhotoCapturePlan = {
  requestedQuality: PhotoQuality;
  appliedQuality: PhotoQuality;
  width: number;
  height: number;
  effectiveDpr: number;
  samples: 0 | 2 | 4;
  mimeType: 'image/png';
  estimatedBytes: {
    renderTargets: number;
    readbackAndCanvas: number;
    encoded: number;
    peak: number;
  };
  memoryBudgetBytes: number;
  degraded: boolean;
  fallbackReasons: PhotoFallbackReason[];
};

export type PhotoStorageEstimate = {
  known: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  availableBytes: number | null;
  requestedBytes: number;
  reserveBytes: number;
  projectedUsageBytes: number | null;
  canStore: boolean | null;
};

export type PhotoThumbnailMetadata = {
  reuseKey: string;
  roomRevision: string;
  cameraSignature: string;
  sourceWidth: number;
  sourceHeight: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  mimeType: string;
  blobBytes: number;
  createdAt: number;
};

export type PhotoCaptureDiagnostics = {
  plansCreated: number;
  degradedPlans: number;
  successfulCaptures: number;
  failedCaptures: number;
  contextLosses: number;
  outOfMemoryFailures: number;
  conservativeUntilMs: number;
  lastPlan: PhotoCapturePlan | null;
  lastFailure: string | null;
  reusableThumbnail: PhotoThumbnailMetadata | null;
};

export type PhotoCaptureFailure = {
  reason: 'context-loss' | 'out-of-memory' | 'encoding' | 'unknown';
  message?: string;
};

export type PhotoCaptureSuccess = {
  plan: PhotoCapturePlan;
  blobBytes: number;
  roomRevision: string | number;
  cameraSignature: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailMimeType?: string;
};

export type PhotoThumbnailReuseRequest = {
  roomRevision: string | number;
  cameraSignature: string;
  minimumWidth?: number;
  minimumHeight?: number;
  maxAgeMs?: number;
};

export type StorageEstimateProvider = () => Promise<{
  usage?: number;
  quota?: number;
}>;

export type PhotoCaptureManagerOptions = {
  memoryBudgetBytes?: number;
  storageEstimate?: StorageEstimateProvider;
  now?: () => number;
};

type QualityConfiguration = {
  dprCap: number;
  minimumShortEdge: number;
  maximumLongEdge: number;
  samples: 0 | 2 | 4;
};

const MEBIBYTE = 1024 * 1024;
const DEFAULT_MEMORY_BUDGET = 96 * MEBIBYTE;
const CONSERVATIVE_DURATION_MS = 5 * 60 * 1_000;

const QUALITY_CONFIG: Readonly<Record<PhotoQuality, QualityConfiguration>> = {
  standard: Object.freeze({
    dprCap: 1.5,
    minimumShortEdge: 900,
    maximumLongEdge: 1_800,
    samples: 2,
  }),
  high: Object.freeze({
    dprCap: 2,
    minimumShortEdge: 900,
    maximumLongEdge: 2_400,
    samples: 4,
  }),
};

const finiteDimension = (value: number) =>
  Math.max(1, Math.round(Number.isFinite(value) ? value : 1));

export class PhotoCaptureManager {
  private readonly defaultMemoryBudget: number;
  private readonly storageEstimate?: StorageEstimateProvider;
  private readonly now: () => number;
  private diagnostics: PhotoCaptureDiagnostics = {
    plansCreated: 0,
    degradedPlans: 0,
    successfulCaptures: 0,
    failedCaptures: 0,
    contextLosses: 0,
    outOfMemoryFailures: 0,
    conservativeUntilMs: 0,
    lastPlan: null,
    lastFailure: null,
    reusableThumbnail: null,
  };

  constructor(options: PhotoCaptureManagerOptions = {}) {
    this.defaultMemoryBudget = Math.max(
      24 * MEBIBYTE,
      options.memoryBudgetBytes ?? DEFAULT_MEMORY_BUDGET,
    );
    this.storageEstimate = options.storageEstimate;
    this.now = options.now ?? (() => Date.now());
  }

  createPlan(request: PhotoCaptureRequest): PhotoCapturePlan {
    const budget = Math.max(
      24 * MEBIBYTE,
      request.memoryBudgetBytes ?? this.defaultMemoryBudget,
    );
    const fallbackReasons: PhotoFallbackReason[] = [];
    let quality = request.quality;
    if (this.now() < this.diagnostics.conservativeUntilMs && quality === 'high') {
      quality = 'standard';
      fallbackReasons.push(
        this.diagnostics.contextLosses
          ? 'recent-context-loss'
          : 'recent-out-of-memory',
      );
    }
    let plan = this.planForQuality(request, quality, budget, fallbackReasons);
    if (plan.estimatedBytes.peak > budget && quality === 'high') {
      quality = 'standard';
      fallbackReasons.push('memory-budget-quality');
      plan = this.planForQuality(request, quality, budget, fallbackReasons);
    }
    if (plan.estimatedBytes.peak > budget && plan.samples > 0) {
      fallbackReasons.push('memory-budget-samples');
      plan = this.withSamples(plan, 0, fallbackReasons);
    }
    if (plan.estimatedBytes.peak > budget) {
      fallbackReasons.push('memory-budget-resolution');
      const ratio = Math.min(1, Math.sqrt(budget / plan.estimatedBytes.peak) * 0.94);
      const width = Math.max(320, Math.floor(plan.width * ratio));
      const height = Math.max(320, Math.floor(plan.height * ratio));
      plan = this.finalizePlan(
        request.quality,
        quality,
        width,
        height,
        plan.effectiveDpr * ratio,
        plan.samples,
        budget,
        fallbackReasons,
      );
    }
    this.diagnostics.plansCreated += 1;
    if (plan.degraded) this.diagnostics.degradedPlans += 1;
    this.diagnostics.lastPlan = plan;
    return plan;
  }

  recordSuccess(success: PhotoCaptureSuccess): PhotoThumbnailMetadata {
    this.diagnostics.successfulCaptures += 1;
    this.diagnostics.lastFailure = null;
    const metadata: PhotoThumbnailMetadata = {
      reuseKey: this.reuseKey(success.roomRevision, success.cameraSignature),
      roomRevision: String(success.roomRevision),
      cameraSignature: success.cameraSignature,
      sourceWidth: success.plan.width,
      sourceHeight: success.plan.height,
      thumbnailWidth: finiteDimension(success.thumbnailWidth),
      thumbnailHeight: finiteDimension(success.thumbnailHeight),
      mimeType: success.thumbnailMimeType ?? 'image/webp',
      blobBytes: Math.max(0, Math.round(success.blobBytes)),
      createdAt: this.now(),
    };
    this.diagnostics.reusableThumbnail = metadata;
    return metadata;
  }

  recordFailure(failure: PhotoCaptureFailure): void {
    this.diagnostics.failedCaptures += 1;
    this.diagnostics.lastFailure = failure.message ?? failure.reason;
    if (failure.reason === 'context-loss') {
      this.diagnostics.contextLosses += 1;
      this.diagnostics.conservativeUntilMs = this.now() + CONSERVATIVE_DURATION_MS;
    } else if (failure.reason === 'out-of-memory') {
      this.diagnostics.outOfMemoryFailures += 1;
      this.diagnostics.conservativeUntilMs = this.now() + CONSERVATIVE_DURATION_MS;
    }
  }

  getReusableThumbnail(
    request: PhotoThumbnailReuseRequest,
  ): PhotoThumbnailMetadata | null {
    const metadata = this.diagnostics.reusableThumbnail;
    if (!metadata) return null;
    if (
      metadata.reuseKey !== this.reuseKey(request.roomRevision, request.cameraSignature) ||
      metadata.thumbnailWidth < (request.minimumWidth ?? 0) ||
      metadata.thumbnailHeight < (request.minimumHeight ?? 0) ||
      this.now() - metadata.createdAt > (request.maxAgeMs ?? 10 * 60 * 1_000)
    )
      return null;
    return { ...metadata };
  }

  invalidateThumbnail(): void {
    this.diagnostics.reusableThumbnail = null;
  }

  async assessStorage(
    requestedBytes: number,
    retainedBytes = 0,
  ): Promise<PhotoStorageEstimate> {
    const requested = Math.max(0, Math.round(requestedBytes + retainedBytes));
    if (!this.storageEstimate)
      return {
        known: false,
        usageBytes: null,
        quotaBytes: null,
        availableBytes: null,
        requestedBytes: requested,
        reserveBytes: 0,
        projectedUsageBytes: null,
        canStore: null,
      };
    try {
      const estimate = await this.storageEstimate();
      const usage = Math.max(0, estimate.usage ?? 0);
      const quota = Math.max(0, estimate.quota ?? 0);
      if (!quota)
        return {
          known: false,
          usageBytes: usage,
          quotaBytes: null,
          availableBytes: null,
          requestedBytes: requested,
          reserveBytes: 0,
          projectedUsageBytes: usage + requested,
          canStore: null,
        };
      const reserve = Math.max(5 * MEBIBYTE, quota * 0.05);
      const available = Math.max(0, quota - usage);
      return {
        known: true,
        usageBytes: usage,
        quotaBytes: quota,
        availableBytes: available,
        requestedBytes: requested,
        reserveBytes: reserve,
        projectedUsageBytes: usage + requested,
        canStore: requested + reserve <= available,
      };
    } catch {
      return {
        known: false,
        usageBytes: null,
        quotaBytes: null,
        availableBytes: null,
        requestedBytes: requested,
        reserveBytes: 0,
        projectedUsageBytes: null,
        canStore: null,
      };
    }
  }

  getDiagnostics(): PhotoCaptureDiagnostics {
    return {
      ...this.diagnostics,
      lastPlan: this.diagnostics.lastPlan
        ? { ...this.diagnostics.lastPlan }
        : null,
      reusableThumbnail: this.diagnostics.reusableThumbnail
        ? { ...this.diagnostics.reusableThumbnail }
        : null,
    };
  }

  private planForQuality(
    request: PhotoCaptureRequest,
    quality: PhotoQuality,
    budget: number,
    reasons: readonly PhotoFallbackReason[],
  ): PhotoCapturePlan {
    const configuration = QUALITY_CONFIG[quality];
    const cssWidth = finiteDimension(request.cssWidth);
    const cssHeight = finiteDimension(request.cssHeight);
    const deviceDpr = Math.max(
      0.75,
      Number.isFinite(request.devicePixelRatio) ? request.devicePixelRatio : 1,
    );
    const dpr = Math.min(deviceDpr, configuration.dprCap);
    let width = cssWidth * dpr;
    let height = cssHeight * dpr;
    const shortEdge = Math.min(width, height);
    if (shortEdge < configuration.minimumShortEdge) {
      const scale = configuration.minimumShortEdge / shortEdge;
      width *= scale;
      height *= scale;
    }
    const longEdge = Math.max(width, height);
    if (longEdge > configuration.maximumLongEdge) {
      const scale = configuration.maximumLongEdge / longEdge;
      width *= scale;
      height *= scale;
    }
    width = finiteDimension(width);
    height = finiteDimension(height);
    return this.finalizePlan(
      request.quality,
      quality,
      width,
      height,
      width / cssWidth,
      configuration.samples,
      budget,
      reasons,
    );
  }

  private withSamples(
    plan: PhotoCapturePlan,
    samples: 0 | 2 | 4,
    reasons: readonly PhotoFallbackReason[],
  ): PhotoCapturePlan {
    return this.finalizePlan(
      plan.requestedQuality,
      plan.appliedQuality,
      plan.width,
      plan.height,
      plan.effectiveDpr,
      samples,
      plan.memoryBudgetBytes,
      reasons,
    );
  }

  private finalizePlan(
    requestedQuality: PhotoQuality,
    appliedQuality: PhotoQuality,
    width: number,
    height: number,
    effectiveDpr: number,
    samples: 0 | 2 | 4,
    memoryBudgetBytes: number,
    reasons: readonly PhotoFallbackReason[],
  ): PhotoCapturePlan {
    const pixels = Math.max(1, width * height);
    const sampleMultiplier = Math.max(1, samples);
    const renderTargets = pixels * 8 * sampleMultiplier;
    const readbackAndCanvas = pixels * 12;
    const encoded = Math.round(pixels * 0.75);
    return {
      requestedQuality,
      appliedQuality,
      width,
      height,
      effectiveDpr,
      samples,
      mimeType: 'image/png',
      estimatedBytes: {
        renderTargets,
        readbackAndCanvas,
        encoded,
        peak: renderTargets + readbackAndCanvas + encoded,
      },
      memoryBudgetBytes,
      degraded: reasons.length > 0,
      fallbackReasons: [...reasons],
    };
  }

  private reuseKey(
    roomRevision: string | number,
    cameraSignature: string,
  ): string {
    return `${String(roomRevision)}::${cameraSignature}`;
  }
}
