import type { SceneObject } from '../core/types'

/**
 * Runtime 对象适配器上下文。
 *
 * 约束：
 * - 只允许 Runtime 层把真实引擎宿主对象放在这里；
 * - Store、命令和页面组件不得读取或持有该上下文；
 * - 具体 Runtime 可把它收窄成 Cesium Viewer、Three renderScene 等最小宿主接口。
 */
export interface SceneObjectAdapterContext<THost = unknown> {
  /** 当前 Runtime 的宿主引擎实例或最小宿主接口。 */
  host: THost
}

/**
 * Runtime 对象适配器创建后的条目。
 *
 * 用途：
 * - 保存领域对象 id 与引擎对象 id 的映射；
 * - 把真实引擎对象限制在 Runtime 内部；
 * - 后续删除、显隐、选中都通过 entry 定位，不反查 Store 或页面状态。
 */
export interface SceneObjectAdapterEntry<TEngineObject = unknown> {
  /** SceneObject.id，作为 Store、命令和 Runtime 之间唯一稳定标识。 */
  sceneObjectId: string
  /** 引擎对象内部标识，例如 Three Object3D uuid 或 Cesium Entity id。 */
  engineObjectId: string
  /** Runtime 内部可选保存的真实引擎对象，上层公共接口不得暴露该字段。 */
  engineObject?: TEngineObject
}

/**
 * Runtime 对象适配器接口。
 *
 * 职责：
 * - 把可序列化 SceneObject 转换为具体引擎对象；
 * - 统一创建、更新、删除、显隐和选中高亮入口；
 * - 避免每个 Runtime 在主类中堆叠对象类型分支。
 */
export interface SceneObjectAdapter<THost = unknown, TEngineObject = unknown> {
  /** 适配器名称，用于日志、测试和错误定位。 */
  readonly name: string

  /** 判断当前适配器是否支持指定领域对象。 */
  canHandle: (object: SceneObject) => boolean

  /** 创建引擎对象，并返回领域对象到引擎对象的映射条目。 */
  create: (
    object: SceneObject,
    context: SceneObjectAdapterContext<THost>,
  ) => Promise<SceneObjectAdapterEntry<TEngineObject>>

  /** 更新既有引擎对象。返回值允许适配器在引擎重建后替换映射条目。 */
  update: (
    object: SceneObject,
    entry: SceneObjectAdapterEntry<TEngineObject>,
    context: SceneObjectAdapterContext<THost>,
  ) => Promise<SceneObjectAdapterEntry<TEngineObject> | void>

  /** 删除引擎对象并释放对象级资源。 */
  remove: (
    entry: SceneObjectAdapterEntry<TEngineObject>,
    context: SceneObjectAdapterContext<THost>,
  ) => void

  /** 同步对象可见性，不应重建对象。 */
  setVisible: (
    entry: SceneObjectAdapterEntry<TEngineObject>,
    visible: boolean,
    context: SceneObjectAdapterContext<THost>,
  ) => void

  /** 同步对象选中态或高亮态，不应改变领域对象数据。 */
  setSelected: (
    entry: SceneObjectAdapterEntry<TEngineObject>,
    selected: boolean,
    context: SceneObjectAdapterContext<THost>,
  ) => void
}

/**
 * 创建稳定的对象适配器条目。
 *
 * 这里集中生成映射对象，避免各 Runtime 重复拼装字段；
 * 没有传入 engineObject 时不会额外写入字段，减少无意义引用保留。
 */
export function createSceneObjectAdapterEntry<TEngineObject = unknown>(options: {
  sceneObjectId: string
  engineObjectId: string
  engineObject?: TEngineObject
}): SceneObjectAdapterEntry<TEngineObject> {
  const entry: SceneObjectAdapterEntry<TEngineObject> = {
    sceneObjectId: options.sceneObjectId,
    engineObjectId: options.engineObjectId,
  }

  if (options.engineObject !== undefined) {
    entry.engineObject = options.engineObject
  }

  return entry
}
