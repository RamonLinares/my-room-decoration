export type QualityTier = 'low' | 'medium' | 'high';

export type DeviceQualityProfile = {
  devicePixelRatio: number;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  coarsePointer?: boolean;
  reducedMotion?: boolean;
  saveData?: boolean;
};

export type QualityRecommendation = {
  tier: QualityTier;
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: 512 | 768 | 1024;
  detailScale: number;
  particleScale: number;
  thumbnailConcurrency: 1 | 2 | 3;
  activeFps: 30 | 45 | 60;
  idleFps: 20 | 24 | 30;
};

export type QualityChangeReason =
  | 'manual'
  | 'sustained-slow'
  | 'sustained-headroom';

export type QualityChange = {
  previous: QualityRecommendation;
  current: QualityRecommendation;
  reason: QualityChangeReason;
  p90FrameMs: number;
  atMs: number;
};

export type QualityDiagnostics = {
  recommendation: QualityRecommendation;
  sampleCount: number;
  p50FrameMs: number;
  p90FrameMs: number;
  slowVotes: number;
  headroomVotes: number;
  lastChangeAtMs: number;
};

export type AdaptiveQualityOptions = {
  initialTier?: QualityTier;
  sampleWindow?: number;
  minimumSamples?: number;
  evaluationInterval?: number;
  downgradeVotes?: number;
  upgradeVotes?: number;
  cooldownMs?: number;
  onChange?: (change: QualityChange) => void;
};

const TIER_ORDER: readonly QualityTier[] = ['low', 'medium', 'high'];

const RECOMMENDATIONS: Readonly<Record<QualityTier, QualityRecommendation>> = {
  low: Object.freeze({
    tier: 'low',
    maxDpr: 1,
    shadows: true,
    shadowMapSize: 512,
    detailScale: 0.62,
    particleScale: 0.45,
    thumbnailConcurrency: 1,
    activeFps: 30,
    idleFps: 20,
  }),
  medium: Object.freeze({
    tier: 'medium',
    maxDpr: 1.35,
    shadows: true,
    shadowMapSize: 768,
    detailScale: 0.82,
    particleScale: 0.7,
    thumbnailConcurrency: 2,
    activeFps: 45,
    idleFps: 24,
  }),
  high: Object.freeze({
    tier: 'high',
    maxDpr: 1.7,
    shadows: true,
    shadowMapSize: 1024,
    detailScale: 1,
    particleScale: 1,
    thumbnailConcurrency: 3,
    activeFps: 60,
    idleFps: 30,
  }),
};

const DOWNGRADE_P90_MS: Readonly<Record<QualityTier, number>> = {
  low: Number.POSITIVE_INFINITY,
  medium: 31,
  high: 22,
};

const UPGRADE_P90_MS: Readonly<Record<QualityTier, number>> = {
  low: 21,
  medium: 15.5,
  high: Number.NEGATIVE_INFINITY,
};

const finitePositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export function recommendInitialQuality(
  profile: DeviceQualityProfile,
): QualityTier {
  const memory = profile.deviceMemoryGb ?? 8;
  const cores = profile.hardwareConcurrency ?? 8;
  const dpr = finitePositive(profile.devicePixelRatio, 1);
  if (profile.saveData || memory <= 2 || cores <= 2) return 'low';
  if (
    memory <= 4 ||
    cores <= 4 ||
    (profile.coarsePointer && dpr >= 2) ||
    profile.reducedMotion
  )
    return 'medium';
  return 'high';
}

export function getQualityRecommendation(
  tier: QualityTier,
): QualityRecommendation {
  return RECOMMENDATIONS[tier];
}

export function boundedDevicePixelRatio(
  devicePixelRatio: number,
  tier: QualityTier | QualityRecommendation,
): number {
  const maximum = typeof tier === 'string' ? RECOMMENDATIONS[tier].maxDpr : tier.maxDpr;
  return Math.min(maximum, Math.max(0.75, finitePositive(devicePixelRatio, 1)));
}

export class AdaptiveQualityManager {
  private readonly sampleWindow: number;
  private readonly minimumSamples: number;
  private readonly evaluationInterval: number;
  private readonly downgradeVotesRequired: number;
  private readonly upgradeVotesRequired: number;
  private readonly cooldownMs: number;
  private readonly onChange?: (change: QualityChange) => void;
  private readonly samples: number[] = [];

  private tier: QualityTier;
  private samplesSinceEvaluation = 0;
  private slowVotes = 0;
  private headroomVotes = 0;
  private lastChangeAtMs = Number.NEGATIVE_INFINITY;

  constructor(options: AdaptiveQualityOptions = {}) {
    this.tier = options.initialTier ?? 'high';
    this.sampleWindow = Math.max(12, Math.round(options.sampleWindow ?? 90));
    this.minimumSamples = Math.min(
      this.sampleWindow,
      Math.max(8, Math.round(options.minimumSamples ?? 45)),
    );
    this.evaluationInterval = Math.max(
      1,
      Math.round(options.evaluationInterval ?? 30),
    );
    this.downgradeVotesRequired = Math.max(
      1,
      Math.round(options.downgradeVotes ?? 2),
    );
    this.upgradeVotesRequired = Math.max(
      this.downgradeVotesRequired + 1,
      Math.round(options.upgradeVotes ?? 5),
    );
    this.cooldownMs = Math.max(0, options.cooldownMs ?? 4_000);
    this.onChange = options.onChange;
  }

  get recommendation(): QualityRecommendation {
    return RECOMMENDATIONS[this.tier];
  }

  get dprLimit(): number {
    return this.recommendation.maxDpr;
  }

  boundDpr(devicePixelRatio: number): number {
    return boundedDevicePixelRatio(devicePixelRatio, this.recommendation);
  }

  recordFrame(frameTimeMs: number, atMs = performance.now()): QualityChange | null {
    if (!Number.isFinite(frameTimeMs) || frameTimeMs <= 0 || frameTimeMs > 250)
      return null;
    this.samples.push(frameTimeMs);
    if (this.samples.length > this.sampleWindow) this.samples.shift();
    this.samplesSinceEvaluation += 1;
    if (
      this.samples.length < this.minimumSamples ||
      this.samplesSinceEvaluation < this.evaluationInterval
    )
      return null;
    this.samplesSinceEvaluation = 0;
    return this.evaluate(atMs);
  }

  setTier(tier: QualityTier, atMs = performance.now()): QualityChange | null {
    return this.changeTier(tier, 'manual', this.percentile(0.9), atMs);
  }

  resetSamples(): void {
    this.samples.length = 0;
    this.samplesSinceEvaluation = 0;
    this.slowVotes = 0;
    this.headroomVotes = 0;
  }

  getDiagnostics(): QualityDiagnostics {
    return {
      recommendation: this.recommendation,
      sampleCount: this.samples.length,
      p50FrameMs: this.percentile(0.5),
      p90FrameMs: this.percentile(0.9),
      slowVotes: this.slowVotes,
      headroomVotes: this.headroomVotes,
      lastChangeAtMs: this.lastChangeAtMs,
    };
  }

  private evaluate(atMs: number): QualityChange | null {
    const p90 = this.percentile(0.9);
    if (p90 > DOWNGRADE_P90_MS[this.tier]) {
      this.slowVotes += 1;
      this.headroomVotes = 0;
    } else if (p90 < UPGRADE_P90_MS[this.tier]) {
      this.headroomVotes += 1;
      this.slowVotes = 0;
    } else {
      this.slowVotes = Math.max(0, this.slowVotes - 1);
      this.headroomVotes = Math.max(0, this.headroomVotes - 1);
    }
    if (atMs - this.lastChangeAtMs < this.cooldownMs) return null;
    const tierIndex = TIER_ORDER.indexOf(this.tier);
    if (this.slowVotes >= this.downgradeVotesRequired && tierIndex > 0)
      return this.changeTier(
        TIER_ORDER[tierIndex - 1],
        'sustained-slow',
        p90,
        atMs,
      );
    if (
      this.headroomVotes >= this.upgradeVotesRequired &&
      tierIndex < TIER_ORDER.length - 1
    )
      return this.changeTier(
        TIER_ORDER[tierIndex + 1],
        'sustained-headroom',
        p90,
        atMs,
      );
    return null;
  }

  private changeTier(
    nextTier: QualityTier,
    reason: QualityChangeReason,
    p90FrameMs: number,
    atMs: number,
  ): QualityChange | null {
    if (nextTier === this.tier) return null;
    const previous = this.recommendation;
    this.tier = nextTier;
    this.lastChangeAtMs = atMs;
    this.slowVotes = 0;
    this.headroomVotes = 0;
    const change: QualityChange = {
      previous,
      current: this.recommendation,
      reason,
      p90FrameMs,
      atMs,
    };
    this.onChange?.(change);
    return change;
  }

  private percentile(percentile: number): number {
    if (!this.samples.length) return 0;
    const ordered = [...this.samples].sort((a, b) => a - b);
    const index = Math.min(
      ordered.length - 1,
      Math.max(0, Math.ceil(percentile * ordered.length) - 1),
    );
    return ordered[index];
  }
}
