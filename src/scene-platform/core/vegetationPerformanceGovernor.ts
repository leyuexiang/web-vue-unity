import type { VegetationQualityPreset } from './types'

/** 自动降级使用的质量顺序；数字越大表示越省性能。 */
const QUALITY_ORDER: readonly VegetationQualityPreset[] = ['high', 'balanced', 'performance']
const LOW_FRAME_RATIO = 0.85
const HIGH_FRAME_RATIO = 1.1
const DOWNGRADE_AFTER_MS = 3_000
const RECOVER_AFTER_MS = 10_000
const QUALITY_CHANGE_COOLDOWN_MS = 15_000

export interface VegetationPerformanceGovernorOptions {
  /** 目标帧率，来自场景植被流式配置，不在调节器内部修改。 */
  readonly targetFps: number
  /** 可注入时钟，便于运行时和无浏览器测试使用同一套时间语义。 */
  readonly now?: () => number
}

export interface VegetationPerformanceGovernorSnapshot {
  readonly userPreset: VegetationQualityPreset
  readonly activePreset: VegetationQualityPreset
  readonly automatic: boolean
  readonly lowSinceMs: number | null
  readonly highSinceMs: number | null
  readonly lastChangeAtMs: number | null
}

/**
 * 基于连续帧窗口的植被运行时质量调节器。
 *
 * 它只保存少量时间戳，不创建定时器、不启动动画循环，也不修改 SceneDefinition。连续低于目标帧率
 * 85% 达 3 秒才降一级；连续高于目标帧率 110% 达 10 秒才恢复一级；两次切换至少间隔 15 秒，
 * 避免单帧尖峰和边界抖动造成频繁切档。用户手动档位始终是上限，自动恢复不会超过该档位。
 */
export class VegetationPerformanceGovernor {
  private targetFps: number
  private readonly now: () => number
  private userPreset: VegetationQualityPreset = 'balanced'
  private activePreset: VegetationQualityPreset = 'balanced'
  private lowSinceMs: number | null = null
  private highSinceMs: number | null = null
  private lastChangeAtMs: number | null = null

  constructor(options: VegetationPerformanceGovernorOptions) {
    this.targetFps = Number.isFinite(options.targetFps) && options.targetFps > 0 ? options.targetFps : 45
    this.now = options.now ?? (() => Date.now())
  }

  /** 用户手动切档立即生效，并清除旧的自动降级计时窗口。 */
  setUserPreset(preset: VegetationQualityPreset): VegetationQualityPreset | null {
    this.userPreset = preset
    this.lowSinceMs = null
    this.highSinceMs = null
    if (this.activePreset === preset) return null
    this.activePreset = preset
    this.lastChangeAtMs = this.now()
    return preset
  }

  /** 场景定义切换时重置调节器，避免上一场景的低帧窗口污染新场景。 */
  reset(preset: VegetationQualityPreset, targetFps?: number): void {
    this.userPreset = preset
    this.activePreset = preset
    this.lowSinceMs = null
    this.highSinceMs = null
    this.lastChangeAtMs = null
    if (targetFps !== undefined && Number.isFinite(targetFps) && targetFps > 0) {
      this.targetFps = targetFps
    }
  }

  /**
   * 恢复一次失败切换前的完整快照。
   *
   * 原子替换候选瓦片失败时，运行时必须同时恢复“用户档位”和“当前自动档位”；只恢复场景定义中的
   * qualityPreset 会丢失自动降级上限，导致下一次高帧恢复越过用户明确选择的档位。该方法只恢复纯
   * 时间戳和枚举值，不创建定时器，也不触碰场景存档。
   */
  restore(snapshot: VegetationPerformanceGovernorSnapshot, targetFps?: number): void {
    this.userPreset = snapshot.userPreset
    this.activePreset = snapshot.activePreset
    this.lowSinceMs = snapshot.lowSinceMs
    this.highSinceMs = snapshot.highSinceMs
    this.lastChangeAtMs = snapshot.lastChangeAtMs
    if (targetFps !== undefined && Number.isFinite(targetFps) && targetFps > 0) {
      this.targetFps = targetFps
    }
  }

  /**
   * 提交一帧的实际帧率；返回 null 表示保持当前档位，返回档位表示需要运行时应用一次切换。
   */
  sample(framesPerSecond: number, timestampMs = this.now()): VegetationQualityPreset | null {
    if (!Number.isFinite(framesPerSecond) || framesPerSecond <= 0) return null
    const lowThreshold = this.targetFps * LOW_FRAME_RATIO
    const highThreshold = this.targetFps * HIGH_FRAME_RATIO
    if (framesPerSecond < lowThreshold) {
      this.highSinceMs = null
      this.lowSinceMs ??= timestampMs
      if (!this.canChange(timestampMs) || timestampMs - this.lowSinceMs < DOWNGRADE_AFTER_MS) return null
      const next = this.stepPerformance(1)
      if (!next) return null
      this.activePreset = next
      this.lastChangeAtMs = timestampMs
      this.lowSinceMs = null
      return next
    }
    if (framesPerSecond > highThreshold) {
      this.lowSinceMs = null
      this.highSinceMs ??= timestampMs
      if (!this.canChange(timestampMs) || timestampMs - this.highSinceMs < RECOVER_AFTER_MS) return null
      const next = this.stepPerformance(-1)
      if (!next) return null
      this.activePreset = next
      this.lastChangeAtMs = timestampMs
      this.highSinceMs = null
      return next
    }
    this.lowSinceMs = null
    this.highSinceMs = null
    return null
  }

  getSnapshot(): VegetationPerformanceGovernorSnapshot {
    return {
      userPreset: this.userPreset,
      activePreset: this.activePreset,
      automatic: this.activePreset !== this.userPreset,
      lowSinceMs: this.lowSinceMs,
      highSinceMs: this.highSinceMs,
      lastChangeAtMs: this.lastChangeAtMs,
    }
  }

  private canChange(timestampMs: number): boolean {
    return this.lastChangeAtMs === null || timestampMs - this.lastChangeAtMs >= QUALITY_CHANGE_COOLDOWN_MS
  }

  private stepPerformance(direction: 1 | -1): VegetationQualityPreset | null {
    const activeIndex = QUALITY_ORDER.indexOf(this.activePreset)
    const userIndex = QUALITY_ORDER.indexOf(this.userPreset)
    const nextIndex = activeIndex + direction
    if (nextIndex < 0 || nextIndex >= QUALITY_ORDER.length) return null
    /** 自动恢复不能超过用户档位；自动降级可以临时向更省性能方向移动。 */
    if (direction < 0 && nextIndex < userIndex) return null
    return QUALITY_ORDER[nextIndex] ?? null
  }
}
