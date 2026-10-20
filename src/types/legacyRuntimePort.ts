import type LegacyScenePort from '@/utils/renderScene'
import type { RenderSceneStoreBridge } from '@/utils/renderScene'
/** 仅保留旧接线参数的静态兼容形态，迁移阶段不提供旧渲染器构造能力。 */
export type RenderSceneApiLike = LegacyScenePort
export interface ThreeRuntimeOptions {
  storeBridge?: RenderSceneStoreBridge
  renderSceneFactory?: (selector: string, bridge?: RenderSceneStoreBridge) => LegacyScenePort
}
