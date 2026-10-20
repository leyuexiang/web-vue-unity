/**
 * 编辑器选中链路所需的 Three 运行时对象标识查询最小接口。
 *
 * 不直接依赖 ThreeSceneRuntime 类，避免结构树、画布等集成组件把具体运行时类型
 * 写入业务逻辑；GIS 运行时或尚未挂载的运行时会自然返回 null。
 */
interface EditorSceneRuntimeObjectIdResolverPort {
  getEngineObjectIdBySceneObjectId?: (objectId: string) => string | null
  getSceneObjectIdByEngineObjectId?: (objectId: string) => string | null
}

const asRuntimeObjectIdResolver = (
  runtime: unknown,
): EditorSceneRuntimeObjectIdResolverPort | null => {
  if (!runtime || typeof runtime !== 'object') return null
  return runtime as EditorSceneRuntimeObjectIdResolverPort
}

/**
 * 将 SceneStore 的业务对象标识转换为旧 Three 界面所需的引擎对象标识。
 *
 * 未找到映射时返回 null：调用方应保留对存量旧对象的原标识兜底，不能把未知对象
 * 误写入 SceneStore，避免触发一次错误的清选和高亮卸载。
 */
export const resolveEditorLegacyEngineObjectId = (
  runtime: unknown,
  sceneObjectId: string | null | undefined,
): string | null => {
  if (!sceneObjectId) return null
  return asRuntimeObjectIdResolver(runtime)?.getEngineObjectIdBySceneObjectId?.(sceneObjectId) ?? null
}

/**
 * 将旧 Three 画布拾取到的引擎对象标识转换为 SceneStore 的业务对象标识。
 *
 * 该函数只做常量时间的运行时映射查询；不遍历场景树，也不读取 Three.Object3D，
 * 防止频繁点击时产生额外线性扫描和页面层对引擎对象的耦合。
 */
export const resolveEditorSceneObjectIdFromLegacyEngineId = (
  runtime: unknown,
  engineObjectId: string | null | undefined,
): string | null => {
  if (!engineObjectId) return null
  return asRuntimeObjectIdResolver(runtime)?.getSceneObjectIdByEngineObjectId?.(engineObjectId) ?? null
}
