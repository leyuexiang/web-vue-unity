import type {
  EffectSpec,
  SceneDefinition,
  SceneLayer,
  SceneObject,
  SceneStreamingConfig,
  SceneSettings,
  CameraPath,
  VegetationSystemDefinition,
} from '../core/types'
import { pruneSceneStreamingChunkObjectReferences } from '../core/sceneDefinition'

/**
 * 相机路径点的编辑器临时选择。
 *
 * 该结构只存在于 SceneStore 的内存状态，用于连接画布拾取、右侧属性面板和 Cesium 辅助图元高亮；
 * 它不是 SceneDefinition 的一部分，因此不会进入保存、导出或撤销重做的数据快照。
 */
export interface CameraPathWaypointSelection {
  pathId: string
  waypointId: string
}

/**
 * SceneStore 事件类型。
 *
 * 约束：事件只表达“领域状态变更”，不携带任何渲染引擎对象引用。
 */
export type SceneStoreEvent =
  | { type: 'sceneLoaded'; scene: SceneDefinition }
  /** 场景级设置的增量更新，不触发对象和效果的全量重建。 */
  | { type: 'sceneSettingsUpdated'; settings: SceneSettings }
  /** 区块和流式分组的可持久化元数据变更。 */
  | { type: 'sceneStreamingUpdated'; streaming: SceneStreamingConfig | undefined }
  | { type: 'objectUpserted'; object: SceneObject }
  | { type: 'objectRemoved'; objectId: string }
  /** 图层事件只同步可序列化管理状态；对象图层不会在 Runtime 中创建父子节点。 */
  | { type: 'layerUpserted'; layer: SceneLayer }
  | { type: 'layerRemoved'; layerId: string }
  | { type: 'effectUpserted'; effect: EffectSpec }
  | { type: 'effectRemoved'; effectId: string }
  | { type: 'selectionChanged'; objectId: string | null }
  | { type: 'effectSelectionChanged'; effectId: string | null }
  | { type: 'cameraPathsUpdated'; cameraPaths: CameraPath[] }
  /** 植被定义整组替换；物种、规则和发布引用始终通过同一个可持久化快照提交。 */
  | { type: 'vegetationUpdated'; vegetation: VegetationSystemDefinition | undefined }
  | { type: 'cameraPathWaypointSelectionChanged'; selection: CameraPathWaypointSelection | null }

export interface SceneStore {
  /**
   * 订阅 Store 内部状态变化事件。
   *
   * 用途：让 RuntimeBridge / UI Adapter 监听领域状态变化，而不是反向依赖 Store 内部字段。
   */
  subscribe: (listener: (event: SceneStoreEvent) => void) => () => void
  getScene: () => SceneDefinition
  /** 获取当前场景所有对象的只读列表（不应直接修改） */
  getObjects: () => readonly SceneObject[]
  /** 获取当前场景所有图层的只读列表（不应直接修改） */
  getLayers: () => readonly SceneLayer[]
  /** 获取当前场景所有效果的只读列表（不应直接修改） */
  getEffects: () => readonly EffectSpec[]
  getCameraPaths: () => readonly CameraPath[]
  /** 读取当前植被领域快照；缺失表示系统尚未创建，而不是空运行时状态。 */
  getVegetation: () => VegetationSystemDefinition | undefined
  getCameraPathWaypointSelection: () => CameraPathWaypointSelection | null
  loadScene: (scene: SceneDefinition) => void
  /** 更新可序列化场景设置，并向 Runtime 发送增量同步事件。 */
  updateSceneSettings: (settings: SceneSettings) => SceneSettings
  /** 原子替换场景流式元数据，供资源实例创建后补齐区块归属。 */
  updateSceneStreaming: (
    streaming: SceneStreamingConfig | undefined,
  ) => SceneStreamingConfig | undefined
  updateCameraPaths: (cameraPaths: CameraPath[]) => CameraPath[]
  /**
   * 原子替换植被定义。调用方必须传入已经过领域校验的新快照，Store 不接收引擎对象或单株实例。
   */
  updateVegetation: (
    vegetation: VegetationSystemDefinition | undefined,
  ) => VegetationSystemDefinition | undefined
  /** 设置路径点的临时编辑选择，不会修改 SceneDefinition 或产生领域命令。 */
  setCameraPathWaypointSelection: (selection: CameraPathWaypointSelection | null) => void
  /**
   * 在 Store 内以事务方式执行一段同步修改。
   *
   * 成功时按原顺序发布事务内事件；失败时恢复执行前快照并丢弃事件，避免命令留下半更新。
   */
  runTransaction: <T>(operation: () => T) => T
  getObject: (objectId: string) => SceneObject | null
  upsertObject: (object: SceneObject) => SceneObject | null
  insertObjectAt: (object: SceneObject, index: number) => void
  removeObject: (objectId: string) => { removed: SceneObject; index: number } | null
  getLayer: (layerId: string) => SceneLayer | null
  upsertLayer: (layer: SceneLayer) => SceneLayer | null
  insertLayerAt: (layer: SceneLayer, index: number) => void
  removeLayer: (layerId: string) => { removed: SceneLayer; index: number } | null
  /** 组锁定不覆盖对象自身 locked；该查询统一给命令和界面计算有效锁定。 */
  isObjectEffectivelyLocked: (objectId: string) => boolean
  getEffect: (effectId: string) => EffectSpec | null
  upsertEffect: (effect: EffectSpec) => EffectSpec | null
  insertEffectAt: (effect: EffectSpec, index: number) => void
  removeEffect: (effectId: string) => { removed: EffectSpec; index: number } | null
  getSelectedObjectId: () => string | null
  setSelectedObjectId: (objectId: string | null) => void
  getSelectedEffectId: () => string | null
  setSelectedEffectId: (effectId: string | null) => void
}

const ROOT_OBJECT_LAYER_KEY = '__root__'

/**
 * 按持久化字段生成对象数组缓存顺序。
 * 根级对象固定排在用户分组前；组内顺序只读取 SceneObject.order，不再依赖接口返回数组的天然顺序。
 */
const sortSceneObjectsByStableOrder = (scene: SceneDefinition): SceneDefinition => {
  const layerRank = new Map(
    scene.layers
      .filter((layer) => layer.type === 'object')
      .sort((first, second) => first.order - second.order)
      .map((layer, index) => [layer.id, index]),
  )
  const originalIndex = new Map(scene.objects.map((object, index) => [object.id, index]))
  const objects = [...scene.objects].sort((first, second) => {
    const firstLayerRank = first.layerId
      ? (layerRank.get(first.layerId) ?? Number.MAX_SAFE_INTEGER)
      : -1
    const secondLayerRank = second.layerId
      ? (layerRank.get(second.layerId) ?? Number.MAX_SAFE_INTEGER)
      : -1
    if (firstLayerRank !== secondLayerRank) return firstLayerRank - secondLayerRank
    if (first.order !== second.order) return first.order - second.order
    return (originalIndex.get(first.id) ?? 0) - (originalIndex.get(second.id) ?? 0)
  })
  reindexSceneObjectOrders(objects)
  return { ...scene, objects }
}

/**
 * 数组在编辑期间仍作为高效视图缓存；发生创建、删除、跨组或组内拖拽后，按当前数组一次线性重编号。
 * 只替换 order 确实变化的对象，避免普通属性编辑产生无关对象分配与运行时同步。
 */
const reindexSceneObjectOrders = (objects: SceneObject[]) => {
  const nextOrderByLayer = new Map<string, number>()
  objects.forEach((object, index) => {
    const layerKey = object.layerId || ROOT_OBJECT_LAYER_KEY
    const order = nextOrderByLayer.get(layerKey) ?? 0
    nextOrderByLayer.set(layerKey, order + 1)
    if (object.order !== order) objects[index] = { ...object, order }
  })
}

export function createSceneStore(initialScene: SceneDefinition): SceneStore {
  /**
   * Store 也可能由测试、宿主或恢复流程直接注入未经过 JSON 解析的旧快照；初始化时先修复一次，
   * 让 RuntimeBridge 后续看到的第一份场景就满足区块对象引用约束。
   */
  const initialStreaming = pruneSceneStreamingChunkObjectReferences({
    id: initialScene.id,
    objects: initialScene.objects,
    streaming: initialScene.streaming,
  })
  const repairedInitialScene =
    initialStreaming === initialScene.streaming
      ? initialScene
      : { ...initialScene, streaming: initialStreaming }
  let scene = sortSceneObjectsByStableOrder(repairedInitialScene)
  let selectedObjectId: string | null = null
  let selectedEffectId: string | null = null
  let selectedCameraPathWaypoint: CameraPathWaypointSelection | null = null
  const listeners = new Set<(event: SceneStoreEvent) => void>()
  let transactionDepth = 0
  let transactionSnapshot: {
    scene: SceneDefinition
    selectedObjectId: string | null
    selectedEffectId: string | null
    selectedCameraPathWaypoint: CameraPathWaypointSelection | null
  } | null = null
  let transactionEvents: SceneStoreEvent[] = []

  const dispatch = (event: SceneStoreEvent) => {
    listeners.forEach((listener) => listener(event))
  }

  const emit = (event: SceneStoreEvent) => {
    if (transactionDepth > 0) {
      transactionEvents.push(event)
      return
    }
    dispatch(event)
  }

  const cloneScene = (input: SceneDefinition): SceneDefinition => structuredClone(input)

  const getObjectIndex = (objectId: string) =>
    scene.objects.findIndex((item) => item.id === objectId)

  const getObject = (objectId: string) => scene.objects.find((item) => item.id === objectId) ?? null

  const getLayerIndex = (layerId: string) => scene.layers.findIndex((item) => item.id === layerId)

  const getLayer = (layerId: string) => scene.layers.find((item) => item.id === layerId) ?? null

  const getEffectIndex = (effectId: string) =>
    scene.effects.findIndex((item) => item.id === effectId)

  const getEffect = (effectId: string) => scene.effects.find((item) => item.id === effectId) ?? null

  const upsertObject = (object: SceneObject) => {
    const index = getObjectIndex(object.id)
    if (index >= 0) {
      const previous = scene.objects[index]
      scene.objects[index] = object
      if (previous.layerId !== object.layerId || previous.order !== object.order) {
        reindexSceneObjectOrders(scene.objects)
      }
      emit({ type: 'objectUpserted', object: getObject(object.id) ?? object })
      return previous
    }

    scene.objects.push(object)
    reindexSceneObjectOrders(scene.objects)
    emit({ type: 'objectUpserted', object: getObject(object.id) ?? object })
    return null
  }

  const insertObjectAt = (object: SceneObject, index: number) => {
    const existingIndex = getObjectIndex(object.id)
    if (existingIndex >= 0) {
      scene.objects.splice(existingIndex, 1)
    }

    const boundedIndex = Math.min(Math.max(index, 0), scene.objects.length)
    scene.objects.splice(boundedIndex, 0, object)
    reindexSceneObjectOrders(scene.objects)
    emit({ type: 'objectUpserted', object: getObject(object.id) ?? object })
  }

  const removeObject = (objectId: string) => {
    const index = getObjectIndex(objectId)
    if (index < 0) return null

    const removed = scene.objects[index]
    scene.objects.splice(index, 1)
    reindexSceneObjectOrders(scene.objects)
    emit({ type: 'objectRemoved', objectId })

    /**
     * 对象是区块索引的外部引用，删除对象后必须在同一事务中裁剪失效编号。
     * 事件顺序保持“对象移除 -> 区块更新”，RuntimeBridge 才会先释放实例，再替换索引，
     * 避免旧区块在增量同步期间继续指向已删除对象。
     */
    const repairedStreaming = pruneSceneStreamingChunkObjectReferences({
      id: scene.id,
      objects: scene.objects,
      streaming: scene.streaming,
    })
    if (repairedStreaming !== scene.streaming) {
      scene = { ...scene, streaming: repairedStreaming }
      emit({ type: 'sceneStreamingUpdated', streaming: repairedStreaming })
    }

    if (selectedObjectId === objectId) {
      selectedObjectId = null
      emit({ type: 'selectionChanged', objectId: null })
    }

    return { removed, index }
  }

  const upsertLayer = (layer: SceneLayer) => {
    const index = getLayerIndex(layer.id)
    if (index >= 0) {
      const previous = scene.layers[index]
      scene.layers[index] = layer
      emit({ type: 'layerUpserted', layer })
      return previous
    }

    scene.layers.push(layer)
    emit({ type: 'layerUpserted', layer })
    return null
  }

  const insertLayerAt = (layer: SceneLayer, index: number) => {
    const existingIndex = getLayerIndex(layer.id)
    if (existingIndex >= 0) scene.layers.splice(existingIndex, 1)
    const boundedIndex = Math.min(Math.max(index, 0), scene.layers.length)
    scene.layers.splice(boundedIndex, 0, layer)
    emit({ type: 'layerUpserted', layer })
  }

  const removeLayer = (layerId: string) => {
    const index = getLayerIndex(layerId)
    if (index < 0) return null
    const removed = scene.layers[index]
    scene.layers.splice(index, 1)
    emit({ type: 'layerRemoved', layerId })
    return { removed, index }
  }

  const upsertEffect = (effect: EffectSpec) => {
    const index = getEffectIndex(effect.id)
    if (index >= 0) {
      const previous = scene.effects[index]
      scene.effects[index] = effect
      emit({ type: 'effectUpserted', effect })
      return previous
    }

    scene.effects.push(effect)
    emit({ type: 'effectUpserted', effect })
    return null
  }

  const insertEffectAt = (effect: EffectSpec, index: number) => {
    const existingIndex = getEffectIndex(effect.id)
    if (existingIndex >= 0) {
      scene.effects.splice(existingIndex, 1)
    }

    const boundedIndex = Math.min(Math.max(index, 0), scene.effects.length)
    scene.effects.splice(boundedIndex, 0, effect)
    emit({ type: 'effectUpserted', effect })
  }

  const removeEffect = (effectId: string) => {
    const index = getEffectIndex(effectId)
    if (index < 0) return null

    const removed = scene.effects[index]
    scene.effects.splice(index, 1)
    emit({ type: 'effectRemoved', effectId })
    if (selectedEffectId === effectId) {
      selectedEffectId = null
      emit({ type: 'effectSelectionChanged', effectId: null })
    }
    return { removed, index }
  }

  const updateSceneSettings = (settings: SceneSettings) => {
    const previous = scene.settings
    /**
     * 用新 SceneDefinition 外壳替换 settings，避免持有旧 settings 引用的保存适配层看到半更新状态。
     * objects/layers/effects 保持原数组引用，RuntimeBridge 因而不会误触发整场景重建。
     */
    scene = {
      ...scene,
      settings,
    }
    emit({ type: 'sceneSettingsUpdated', settings })
    return previous
  }

  /**
   * 原子替换区块、分组和策略配置。
   *
   * 区块归属属于场景定义而非单个对象字段；资源实例创建后由编辑器适配层调用此入口，
   * RuntimeBridge 会按场景流式索引重新注册，避免直接修改 getScene() 返回对象造成界面和运行时不同步。
   */
  const updateSceneStreaming = (streaming: SceneStreamingConfig | undefined) => {
    const previous = scene.streaming
    /**
     * 流式配置可能来自资源创建、恢复或外部适配器；统一在 Store 边界过滤不存在的对象编号，
     * 防止任意调用方把坏索引重新写回场景。对象尚未 upsert 时应先提交对象，再提交区块配置。
     */
    const repairedStreaming = pruneSceneStreamingChunkObjectReferences({
      id: scene.id,
      objects: scene.objects,
      streaming,
    })
    if (repairedStreaming === undefined) {
      const { streaming: _removedStreaming, ...sceneWithoutStreaming } = scene
      scene = sceneWithoutStreaming as SceneDefinition
    } else {
      scene = { ...scene, streaming: repairedStreaming }
    }
    emit({ type: 'sceneStreamingUpdated', streaming: repairedStreaming })
    return previous
  }

  /** 以整组替换路径数组，保证路径点编辑只产生一个领域事件并可被命令撤销。 */
  const updateCameraPaths = (cameraPaths: CameraPath[]) => {
    const previous = scene.cameraPaths ?? []
    scene = { ...scene, cameraPaths }
    emit({ type: 'cameraPathsUpdated', cameraPaths })
    /**
     * 命令撤销、删除路径或外部加载可使临时选择指向失效点；在同一批事件中清除它，
     * RuntimeBridge 会先重建辅助实体再清除高亮，不会留下过期 Entity 状态。
     */
    if (
      selectedCameraPathWaypoint &&
      !cameraPaths.some(
        (path) =>
          path.id === selectedCameraPathWaypoint?.pathId &&
          path.waypoints.some((point) => point.id === selectedCameraPathWaypoint?.waypointId),
      )
    ) {
      selectedCameraPathWaypoint = null
      emit({ type: 'cameraPathWaypointSelectionChanged', selection: null })
    }
    return previous
  }

  /**
   * 使用新的 SceneDefinition 外壳替换植被快照，保持对象、普通图层和效果数组引用稳定。
   * 删除系统时同时删除可选字段，而不是长期保存显式 undefined，确保序列化结果与旧场景兼容。
   */
  const updateVegetation = (vegetation: VegetationSystemDefinition | undefined) => {
    const previous = scene.vegetation
    if (vegetation === undefined) {
      const { vegetation: _removedVegetation, ...sceneWithoutVegetation } = scene
      scene = sceneWithoutVegetation as SceneDefinition
    } else {
      scene = { ...scene, vegetation }
    }
    emit({ type: 'vegetationUpdated', vegetation })
    return previous
  }

  /**
   * 写入前依据当前路径数据验证选择目标，避免异步画布拾取结果在路径已删除后选中幽灵点。
   *
   * 此方法不调用 CommandBus，不修改场景定义；仅向 UI 与 Runtime 发出临时交互事件。
   */
  const setCameraPathWaypointSelection = (selection: CameraPathWaypointSelection | null) => {
    const nextSelection =
      selection &&
      scene.cameraPaths?.some(
        (path) =>
          path.id === selection.pathId &&
          path.waypoints.some((point) => point.id === selection.waypointId),
      )
        ? { ...selection }
        : null
    if (
      selectedCameraPathWaypoint?.pathId === nextSelection?.pathId &&
      selectedCameraPathWaypoint?.waypointId === nextSelection?.waypointId
    ) {
      return
    }
    selectedCameraPathWaypoint = nextSelection
    emit({ type: 'cameraPathWaypointSelectionChanged', selection: nextSelection })
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getScene: () => scene,
    getObjects: () => scene.objects,
    getLayers: () => scene.layers,
    getEffects: () => scene.effects,
    getCameraPaths: () => scene.cameraPaths ?? [],
    getVegetation: () => scene.vegetation,
    getCameraPathWaypointSelection: () =>
      selectedCameraPathWaypoint ? { ...selectedCameraPathWaypoint } : null,
    loadScene: (nextScene) => {
      /**
       * 统一加载入口也执行一次纯数据修复，覆盖绕过 JSON 解析器而直接注入旧快照的宿主路径。
       * 没有失效引用时保持原场景对象引用，避免普通场景切换产生额外深拷贝。
       */
      const repairedStreaming = pruneSceneStreamingChunkObjectReferences({
        id: nextScene.id,
        objects: nextScene.objects,
        streaming: nextScene.streaming,
      })
      const repairedScene =
        repairedStreaming === nextScene.streaming
          ? nextScene
          : { ...nextScene, streaming: repairedStreaming }
      scene = sortSceneObjectsByStableOrder(repairedScene)
      selectedObjectId = null
      selectedEffectId = null
      selectedCameraPathWaypoint = null
      emit({ type: 'sceneLoaded', scene })
      emit({ type: 'selectionChanged', objectId: null })
      emit({ type: 'effectSelectionChanged', effectId: null })
      emit({ type: 'cameraPathWaypointSelectionChanged', selection: null })
    },
    updateSceneSettings,
    updateSceneStreaming,
    updateCameraPaths,
    updateVegetation,
    setCameraPathWaypointSelection,
    runTransaction: (operation) => {
      const isOuterTransaction = transactionDepth === 0

      if (isOuterTransaction) {
        transactionSnapshot = {
          scene: cloneScene(scene),
          selectedObjectId,
          selectedEffectId,
          selectedCameraPathWaypoint,
        }
        transactionEvents = []
      }

      transactionDepth += 1

      try {
        const result = operation()
        transactionDepth -= 1

        if (isOuterTransaction) {
          const events = transactionEvents
          transactionSnapshot = null
          transactionEvents = []
          events.forEach(dispatch)
        }

        return result
      } catch (error) {
        transactionDepth -= 1

        if (isOuterTransaction && transactionSnapshot) {
          scene = transactionSnapshot.scene
          selectedObjectId = transactionSnapshot.selectedObjectId
          selectedEffectId = transactionSnapshot.selectedEffectId
          selectedCameraPathWaypoint = transactionSnapshot.selectedCameraPathWaypoint
          transactionSnapshot = null
          transactionEvents = []
        }

        throw error
      }
    },
    getObject,
    upsertObject,
    insertObjectAt,
    removeObject,
    getLayer,
    upsertLayer,
    insertLayerAt,
    removeLayer,
    isObjectEffectivelyLocked: (objectId) => {
      const object = getObject(objectId)
      if (!object) return false
      const layerLocked = object.layerId ? getLayer(object.layerId)?.locked === true : false
      return object.locked || layerLocked
    },
    getEffect,
    upsertEffect,
    insertEffectAt,
    removeEffect,
    getSelectedObjectId: () => selectedObjectId,
    getSelectedEffectId: () => selectedEffectId,
    setSelectedObjectId: (objectId) => {
      const nextSelectedId = objectId && getObject(objectId) ? objectId : null
      if (nextSelectedId === selectedObjectId) return
      selectedObjectId = nextSelectedId
      if (nextSelectedId && selectedEffectId) {
        selectedEffectId = null
        emit({ type: 'effectSelectionChanged', effectId: null })
      }
      emit({ type: 'selectionChanged', objectId: selectedObjectId })
    },
    setSelectedEffectId: (effectId) => {
      const nextSelectedId = effectId && getEffect(effectId) ? effectId : null
      if (nextSelectedId === selectedEffectId) return
      selectedEffectId = nextSelectedId
      if (nextSelectedId && selectedObjectId) {
        selectedObjectId = null
        emit({ type: 'selectionChanged', objectId: null })
      }
      emit({ type: 'effectSelectionChanged', effectId: selectedEffectId })
    },
  }
}
