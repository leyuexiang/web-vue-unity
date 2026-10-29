import type { VegetationQualityPreset } from './types'

/**
 * 植被自身的阴影参与方式。
 *
 * 该类型只描述植被的局部渲染意图，不控制天气系统的全局阴影开关、阴影贴图尺寸或级联参数。
 * 运行时通过 Unity 协议应用该语义，领域数据不依赖具体引擎枚举。
 */
export type VegetationShadowMode = 'enabled' | 'receive-only' | 'disabled'

/** 三档植被渲染的跨正式瓦片和编辑预览共享语义。 */
export interface VegetationQualityRenderingProfile {
  /** 植被是否投射阴影、只接收阴影或完全退出阴影计算。 */
  shadowMode: VegetationShadowMode
  /** 该档位的推荐正式植被最大显示距离，单位为米；用户仍可手动改成自定义值。 */
  recommendedDisplayDistanceM: number
}

/**
 * 三档推荐值：高清覆盖完整近景，均衡收缩远景范围，性能进一步减少远景瓦片参与。
 *
 * 数值只作为切换档位时的推荐初始值，不会覆盖用户已明确输入的自定义距离；界面在偏离推荐值时
 * 显示“自定义”，运行时仍严格使用场景中保存的实际距离。
 */
export const VEGETATION_QUALITY_RENDERING_PROFILES: Readonly<
  Record<VegetationQualityPreset, Readonly<VegetationQualityRenderingProfile>>
> = Object.freeze({
  high: Object.freeze({
    shadowMode: 'enabled' as const,
    recommendedDisplayDistanceM: 10_000,
  }),
  balanced: Object.freeze({
    shadowMode: 'receive-only' as const,
    recommendedDisplayDistanceM: 8_000,
  }),
  performance: Object.freeze({
    shadowMode: 'disabled' as const,
    recommendedDisplayDistanceM: 5_000,
  }),
})

/** 返回独立对象，避免调用方意外修改共享档位配置。 */
export function resolveVegetationQualityRenderingProfile(
  preset: VegetationQualityPreset,
): VegetationQualityRenderingProfile {
  return { ...VEGETATION_QUALITY_RENDERING_PROFILES[preset] }
}
