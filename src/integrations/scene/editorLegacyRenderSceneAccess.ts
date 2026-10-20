import type { SceneRuntime, ViewportHost } from '@/scene-platform'
import type { RenderSceneApiLike } from '@/types/legacyRuntimePort'
/** 二维宿主不持有旧渲染器；历史调用仅得到明确空值，不能隐式创建第二套引擎。 */
export const getLegacyRenderSceneApiFromRuntime = (_runtime?: SceneRuntime | null): RenderSceneApiLike | null => null
export const getLegacyRenderSceneApiFromViewportHost = (_host?: ViewportHost | null): RenderSceneApiLike | null => null
