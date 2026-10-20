import type { SceneSettings } from './types'

type PlainRecord = Record<string, unknown>

/** 整场画质预设；它与植被三档密度是两套独立的业务设置。 */
export type SceneQualityPreset = 'high' | 'balanced' | 'performance'

/**
 * 整场渲染比例的受控取值。
 *
 * 性能档只把绘制缓冲降到 85%，CSS 画布尺寸和交互坐标仍保持原始尺寸；这样不会改变场景布局，
 * 也不会让植被面板承担整场分辨率策略。
 */
export type SceneRenderScale = 0.85 | 1

/**
 * 场景可保存的抗锯齿方案。
 *
 * - 多重采样（MSAA，Multisample Anti-Aliasing）由渲染目标或 WebGL 上下文完成边缘采样；
 * - 快速近似（FXAA，Fast Approximate Anti-Aliasing）和子像素形态学（SMAA，Subpixel Morphological
 *   Anti-Aliasing）属于全屏后处理；
 * - 超采样（SSAA，Supersample Anti-Aliasing）提高实际绘制分辨率后再缩回显示尺寸。
 *
 * 领域层只保存用户期望的方案，Runtime 负责检测引擎和浏览器能力并进行受控降级，不能把
 * Cesium Viewer、Three 后处理器或 WebGL 上下文对象写入场景 JSON。
 */
export type SceneAntialiasingMode = 'none' | 'msaa' | 'fxaa' | 'smaa' | 'ssaa'

/**
 * 引擎无关的抗锯齿配置。
 *
 * `msaaSamples` 只由支持显式采样数的 Runtime 消费；Three 的浏览器默认帧缓冲采样数由驱动决定。
 * `supersampleScale` 上限固定为 1.5，避免单个表单改动把宽高同时翻倍而造成四倍绘制缓冲和显存压力。
 */
export interface SceneAntialiasingSettings {
  mode: SceneAntialiasingMode
  msaaSamples: 2 | 4 | 8
  supersampleScale: 1 | 1.25 | 1.5
}

/** 场景渲染比例的历史兼容默认值。 */
export const DEFAULT_SCENE_RENDER_SCALE: SceneRenderScale = 1

/** 新场景默认采用原有高清渲染语义，确保升级历史场景时画面不意外变糊。 */
export const DEFAULT_SCENE_QUALITY_PRESET: SceneQualityPreset = 'high'

/**
 * 三档整场画质的稳定映射。
 *
 * 这里仅保存引擎无关的公开参数；Runtime 再把抗锯齿和渲染比例映射到 Three 或 Cesium。性能档的
 * 85% 渲染比例是首轮推荐值，后续真实设备压测仍可调整常量而不改变场景数据结构。
 */
export const SCENE_QUALITY_PRESET_SETTINGS: Readonly<
  Record<SceneQualityPreset, {
    readonly antialiasing: SceneAntialiasingSettings
    readonly renderScale: SceneRenderScale
  }>
> = Object.freeze({
  high: Object.freeze({
    antialiasing: Object.freeze({ mode: 'msaa' as const, msaaSamples: 4 as const, supersampleScale: 1 as const }),
    renderScale: 1 as const,
  }),
  balanced: Object.freeze({
    antialiasing: Object.freeze({ mode: 'msaa' as const, msaaSamples: 2 as const, supersampleScale: 1 as const }),
    renderScale: 1 as const,
  }),
  performance: Object.freeze({
    antialiasing: Object.freeze({ mode: 'fxaa' as const, msaaSamples: 2 as const, supersampleScale: 1 as const }),
    renderScale: 0.85 as const,
  }),
})

const QUALITY_PRESETS = new Set<SceneQualityPreset>(['high', 'balanced', 'performance'])

/** 历史场景缺少抗锯齿详细配置时使用的兼容默认值。 */
export const DEFAULT_SCENE_ANTIALIASING_SETTINGS: SceneAntialiasingSettings = Object.freeze({
  mode: 'msaa',
  msaaSamples: 4,
  supersampleScale: 1.5,
})

const ANTIALIASING_MODES = new Set<SceneAntialiasingMode>([
  'none',
  'msaa',
  'fxaa',
  'smaa',
  'ssaa',
])

const normalizeMsaaSamples = (value: unknown): SceneAntialiasingSettings['msaaSamples'] => {
  if (value === 2 || value === 4 || value === 8) return value
  return DEFAULT_SCENE_ANTIALIASING_SETTINGS.msaaSamples
}

const normalizeSupersampleScale = (value: unknown): SceneAntialiasingSettings['supersampleScale'] => {
  if (value === 1 || value === 1.25 || value === 1.5) return value
  return DEFAULT_SCENE_ANTIALIASING_SETTINGS.supersampleScale
}

const normalizeRenderScale = (value: unknown): SceneRenderScale => {
  if (value === 0.85 || value === 1) return value
  return DEFAULT_SCENE_RENDER_SCALE
}

const isSceneQualityPreset = (value: unknown): value is SceneQualityPreset =>
  typeof value === 'string' && QUALITY_PRESETS.has(value as SceneQualityPreset)

/** 读取保存的整场画质档位；手工调整抗锯齿后没有显式档位时返回 null，界面显示“自定义”。 */
export const getSceneQualityPreset = (settings: SceneSettings): SceneQualityPreset | null => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : null
  return isSceneQualityPreset(rendering?.qualityPreset) ? rendering.qualityPreset : null
}

/** 读取整场绘制比例；历史场景和非法外部数据均回退到 100%。 */
export const getSceneRenderScale = (settings: SceneSettings): SceneRenderScale => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : null
  return normalizeRenderScale(rendering?.renderScale)
}

/**
 * 写入整场画质预设。
 *
 * 预设一次性更新抗锯齿和绘制比例，保留渲染设置中的天气、背景等其他字段；命令层会把整个结果作为
 * 一次可撤销快照提交，避免用户选择预设后只恢复半套渲染参数。
 */
export const mergeSceneQualityPreset = (
  settings: SceneSettings,
  preset: SceneQualityPreset,
): SceneSettings => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : {}
  const profile = SCENE_QUALITY_PRESET_SETTINGS[preset]
  return {
    ...settings,
    rendering: {
      ...rendering,
      qualityPreset: preset,
      renderScale: profile.renderScale,
      antialias: profile.antialiasing.mode !== 'none',
      antialiasing: { ...profile.antialiasing },
    },
  }
}

/** 清除档位标记，供用户手工改抗锯齿时显示“自定义”，但不修改实际渲染参数。 */
export const clearSceneQualityPreset = (settings: SceneSettings): SceneSettings => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : {}
  const { qualityPreset: _qualityPreset, ...renderingWithoutPreset } = rendering
  return { ...settings, rendering: renderingWithoutPreset }
}

/**
 * 判断值是否为可安全展开的普通对象。
 *
 * 场景设置来自历史数据或后端 JSON，不能假定 `rendering` 一定是对象；
 * 非对象值必须按缺失处理，避免展开字符串、数组或运行时实例造成持久化数据损坏。
 */
const isPlainRecord = (value: unknown): value is PlainRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * 读取场景抗锯齿开关。
 *
 * 历史场景没有该字段时默认启用，保持 Three 旧渲染器原有的 `antialias: true` 行为，
 * 同时让新增的 Cesium 场景与本地三维场景拥有一致的默认视觉质量。
 */
export const getSceneAntialiasEnabled = (settings: SceneSettings): boolean => {
  return getSceneAntialiasingSettings(settings).mode !== 'none'
}

/**
 * 读取完整的场景抗锯齿配置。
 *
 * 新格式存放在 `settings.rendering.antialiasing`；旧格式只有 `antialias: boolean` 时保持原语义：
 * true 映射为默认 4 倍 MSAA，false 映射为关闭。这样旧存档不会因升级而变模糊或意外打开后处理。
 */
export const getSceneAntialiasingSettings = (
  settings: SceneSettings,
): SceneAntialiasingSettings => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : null
  const antialiasing = isPlainRecord(rendering?.antialiasing) ? rendering.antialiasing : null
  const requestedMode = antialiasing?.mode

  if (typeof requestedMode === 'string' && ANTIALIASING_MODES.has(requestedMode as SceneAntialiasingMode)) {
    return {
      mode: requestedMode as SceneAntialiasingMode,
      msaaSamples: normalizeMsaaSamples(antialiasing?.msaaSamples),
      supersampleScale: normalizeSupersampleScale(antialiasing?.supersampleScale),
    }
  }

  if (rendering?.antialias === false) {
    return {
      ...DEFAULT_SCENE_ANTIALIASING_SETTINGS,
      mode: 'none',
    }
  }

  return { ...DEFAULT_SCENE_ANTIALIASING_SETTINGS }
}

/**
 * 合并完整抗锯齿方案，并同时写回旧布尔字段。
 *
 * 继续保留 `antialias` 是为了让尚未升级的旧编辑器读取新场景时仍能显示正确的启用状态；新 Runtime
 * 只以 `antialiasing` 的完整配置为准。所有字段均先规范化，避免接口或手工 JSON 注入不可支持采样数。
 */
export const mergeSceneAntialiasingSettings = (
  settings: SceneSettings,
  nextSettings: SceneAntialiasingSettings,
): SceneSettings => {
  const rendering = isPlainRecord(settings.rendering) ? settings.rendering : {}
  const normalized: SceneAntialiasingSettings = {
    mode: ANTIALIASING_MODES.has(nextSettings.mode) ? nextSettings.mode : 'msaa',
    msaaSamples: normalizeMsaaSamples(nextSettings.msaaSamples),
    supersampleScale: normalizeSupersampleScale(nextSettings.supersampleScale),
  }

  return {
    ...settings,
    rendering: {
      ...rendering,
      antialias: normalized.mode !== 'none',
      antialiasing: normalized,
    },
  }
}

/**
 * 合并场景抗锯齿设置。
 *
 * 兼容旧版布尔开关并同步完整方案。
 *
 * 历史入口仍可能只传入 true / false。若只改旧字段而保留已有 `antialiasing.mode`，读取时会优先
 * 命中详细配置，导致“关闭”实际仍按原方案渲染。因此这里同时更新详细配置，保证旧入口、保存恢复
 * 和新面板对同一场景得出一致结果；其余渲染设置仍按不可变方式完整保留。
 */
export const mergeSceneAntialiasSettings = (
  settings: SceneSettings,
  enabled: boolean,
): SceneSettings => {
  const current = getSceneAntialiasingSettings(settings)
  const mode = enabled
    ? (current.mode === 'none' ? DEFAULT_SCENE_ANTIALIASING_SETTINGS.mode : current.mode)
    : 'none'

  return mergeSceneAntialiasingSettings(settings, {
    ...current,
    mode,
  })
}
