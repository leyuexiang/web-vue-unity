import type { EffectSpec, SceneDefinition, SceneObject, SceneType } from '../core/types'
import { createDefaultRuntimeCapabilities } from './runtimeCapabilities'
import type { SceneRuntime } from './sceneRuntime'
import type { SceneObjectActivationResolver } from './sceneRuntime'
import {
  RuntimeObjectComponentIndex,
  type RuntimeObjectComponentKind,
} from './runtimeObjectComponentIndex'
import {
  createRuntimeStreamingState,
  createRuntimeVegetationState,
  type FrameTarget,
  type PickResult,
  type PickWorldPoint,
  type RuntimeStreamingState,
  type RuntimeTerrainHeightSample,
  type RuntimeTerrainSamplePosition,
  type RuntimeTerrainSamplingCapabilities,
  type RuntimeTerrainSamplingOptions,
  type RuntimeVegetationState,
  type SceneCameraState,
  type SceneObjectStreamingInteraction,
  type ScreenPoint,
} from './runtimeTypes'

/**
 * Runtime 骨架基类。
 *
 * 用途：
 * - 抽出 Cesium / Three Runtime 的共同生命周期和对象缓存；
 * - 保证真实 Runtime 接入前，工厂已经按类型返回正确 Runtime；
 * - 后续子类只需要重写 mount/loadScene/upsertObject 等与引擎相关的方法。
 *
 * 性能约束：
 * - 对象以 Map 存储，upsert/remove 是 O(1)；
 * - 不在基类里做整场景重建，避免高频编辑触发全量刷新。
 */
export abstract class BaseSceneRuntime implements SceneRuntime {
  readonly id: string
  readonly type: SceneType
  readonly capabilities: ReturnType<typeof createDefaultRuntimeCapabilities>

  protected container: HTMLElement | null = null
  protected scene: SceneDefinition | null = null
  protected objectMap = new Map<string, SceneObject>()
  /**
   * Runtime 自有场景快照中对象编号到数组位置的索引。
   *
   * `objectMap` 只解决按编号读取，流式区块注册仍需要读取 `scene.objects`。增量新增、更新时通过该
   * 索引以 O(1) 同步数组，避免每次对象变更都线性扫描整场景；真正删除对象时才重排删除位置后的
   * 索引。远处区块卸载不会调用 `removeObject()`，因此相机移动不会触发这段线性整理。
   */
  protected objectSnapshotIndexById = new Map<string, number>()
  protected effectMap = new Map<string, EffectSpec>()
  protected selectedObjectId: string | null = null
  protected camera: SceneCameraState = { kind: 'unknown' }
  protected disposed = false
  protected renderingSuspended = false
  /** 当前 Runtime 是否允许创建或显示编辑辅助器；发布预览会在加载前切换为 false。 */
  protected editingEnabled = true
  protected readonly objectComponents = new RuntimeObjectComponentIndex()
  /** 发布运行态按需恢复使用的生命周期监听器；不参与场景序列化。 */
  private readonly objectLifecycleListeners = new Set<
    (event: { type: 'mounted' | 'unmounted'; objectId: string }) => void
  >()
  /** 发布预览注入的按需补全器；只存在于当前 Runtime 内存，不进入领域模型或保存数据。 */
  private objectActivationResolver: SceneObjectActivationResolver | null = null
  /** 场景替换、清空或销毁时递增，阻止迟到的依赖响应写入新场景。 */
  private objectActivationGeneration = 0

  constructor(type: SceneType, id: string) {
    this.type = type
    this.id = id
    this.capabilities = createDefaultRuntimeCapabilities(type)
  }

  /**
   * 挂载 Runtime 到编辑器容器。
   * 基类只记录容器引用并重置销毁标记，具体引擎初始化由子类扩展。
   */
  async mount(container: HTMLElement): Promise<void> {
    this.container = container
    this.disposed = false
  }

  /**
   * 销毁 Runtime 基础状态。
   * 会释放容器引用、清空场景对象缓存，并标记当前 Runtime 已销毁。
   */
  dispose(): void {
    this.container = null
    /**
     * dispose 是同步生命周期入口，不能依赖子类可能异步的清场实现。
     * 只重置本基类拥有的领域索引；具体引擎资源仍由子类 dispose 在销毁前主动释放。
     */
    this.resetRuntimeState()
    this.objectActivationResolver = null
    this.objectActivationGeneration += 1
    this.editingEnabled = true
    this.renderingSuspended = false
    this.disposed = true
  }

  /**
   * 设置编辑能力开关。
   *
   * 基类只保存统一状态，具体 Runtime 在关闭编辑能力时负责摘除自身引擎辅助器。
   */
  setEditingEnabled(enabled: boolean): void {
    this.editingEnabled = enabled
  }

  /** Memory Runtime 和尚未接入真实循环的 Runtime 仅记录状态，不产生副作用。 */
  setRenderingSuspended(suspended: boolean): void {
    this.renderingSuspended = suspended
  }

  subscribeObjectLifecycle(
    listener: (event: { type: 'mounted' | 'unmounted'; objectId: string }) => void,
  ): () => void {
    this.objectLifecycleListeners.add(listener)
    return () => this.objectLifecycleListeners.delete(listener)
  }

  /**
   * 设置对象激活补全器。
   * 使用替换语义，确保预览控制器销毁或切换数据源时不会遗留旧票据和请求闭包。
   */
  setObjectActivationResolver(resolver: SceneObjectActivationResolver | null): void {
    this.objectActivationResolver = resolver
  }

  /** 由具体 Runtime 在引擎映射成功后调用，通知发布运行态恢复行为配置。 */
  protected notifyObjectMounted(objectId: string): void {
    this.objectLifecycleListeners.forEach((listener) => listener({ type: 'mounted', objectId }))
  }

  /** 由具体 Runtime 在真实引擎对象释放后调用，停止外部数据/事件监听。 */
  protected notifyObjectUnmounted(objectId: string): void {
    this.objectLifecycleListeners.forEach((listener) => listener({ type: 'unmounted', objectId }))
  }

  /**
   * 返回 Runtime 是否已被销毁，供桥接层和测试判断生命周期状态。
   */
  get isDisposed(): boolean {
    return this.disposed
  }

  /**
   * 判断对象缓存中是否存在指定领域对象。
   */
  hasObject(objectId: string): boolean {
    return this.objectMap.has(objectId)
  }

  /**
   * 加载完整 SceneDefinition。
   * 基类只同步领域场景和对象缓存，真实引擎对象创建由子类覆盖实现。
   */
  async loadScene(scene: SceneDefinition): Promise<void> {
    this.objectActivationGeneration += 1
    /**
     * Runtime 拥有独立的对象数组外壳，后续增量同步不会反向修改 Store 交给它的历史快照；对象本身
     * 是不可变命令产生的值对象，只有发生更新时才会在对应位置被新引用替换，无需深克隆大型场景。
     */
    this.scene = { ...scene, objects: [...scene.objects] }
    this.objectMap = new Map(scene.objects.map((item) => [item.id, item]))
    this.objectSnapshotIndexById = new Map(scene.objects.map((item, index) => [item.id, index]))
    this.effectMap = new Map(scene.effects.map((item) => [item.id, item]))
    this.selectedObjectId = null
    this.objectComponents.replaceObjects(scene.objects, this.selectedObjectId)
  }

  /**
   * 清空当前场景的领域状态和选择状态。
   */
  clearScene(): void {
    this.objectActivationGeneration += 1
    this.resetRuntimeState()
  }

  /**
   * 清理基类持有的同步领域状态。
   *
   * 此方法被 dispose 复用，刻意不调用可被子类覆盖的 clearScene，避免销毁阶段遗留未等待的
   * 异步任务；Map 的 clear 为 O(1)，不会遍历大型场景对象集合。
   */
  protected resetRuntimeState(): void {
    this.scene = null
    this.objectMap.clear()
    this.objectSnapshotIndexById.clear()
    this.effectMap.clear()
    this.selectedObjectId = null
    this.objectComponents.clear()
    this.objectLifecycleListeners.clear()
  }

  /**
   * 新增或更新单个领域对象缓存。
   */
  async upsertObject(object: SceneObject): Promise<void> {
    this.writeObjectSnapshot(object)
  }

  /**
   * 在引擎实例创建前批量补齐本次真正激活的对象。
   *
   * 未注入补全器时直接返回领域缓存；注入后只接收本批实例的返回值，并在场景代次仍有效时原位更新
   * Runtime 私有快照。返回顺序严格跟随输入编号，便于区块加载器保持稳定创建顺序。
   */
  protected async resolveObjectsForActivation(
    objectIds: readonly string[],
  ): Promise<SceneObject[]> {
    const uniqueIds = [...new Set(objectIds.filter((id) => typeof id === 'string' && id.trim()))]
    if (!uniqueIds.length) return []
    const resolver = this.objectActivationResolver
    if (!resolver) {
      return uniqueIds
        .map((objectId) => this.objectMap.get(objectId))
        .filter((object): object is SceneObject => Boolean(object))
    }

    const generation = this.objectActivationGeneration
    const resolvedObjects = await resolver(uniqueIds)
    if (generation !== this.objectActivationGeneration || this.disposed) {
      throw new Error('对象激活依赖请求已失效。')
    }

    const requestedIds = new Set(uniqueIds)
    resolvedObjects.forEach((object) => {
      if (requestedIds.has(object.id) && this.objectMap.has(object.id)) {
        this.writeObjectSnapshot(object)
      }
    })
    return uniqueIds
      .map((objectId) => this.objectMap.get(objectId))
      .filter((object): object is SceneObject => Boolean(object))
  }

  /**
   * 从对象缓存中移除指定对象。
   * 如果被移除对象正处于选中状态，同步清空选中 id。
   */
  removeObject(objectId: string): void {
    this.objectMap.delete(objectId)
    const sceneObjectIndex = this.objectSnapshotIndexById.get(objectId)
    this.objectSnapshotIndexById.delete(objectId)
    if (this.scene && sceneObjectIndex !== undefined) {
      this.scene.objects.splice(sceneObjectIndex, 1)
      /** splice 会移动后续元素，只重建受影响的尾段索引，不扫描删除位置之前的对象。 */
      for (let index = sceneObjectIndex; index < this.scene.objects.length; index += 1) {
        this.objectSnapshotIndexById.set(this.scene.objects[index].id, index)
      }
    }
    this.objectComponents.deleteObject(objectId)
    if (this.selectedObjectId === objectId) {
      this.selectedObjectId = null
      this.objectComponents.setSelectedObject(this.selectedObjectId)
    }
  }

  /**
   * 新增或更新单个效果缓存。
   * 第 1 阶段只记录领域快照，真实环境渲染由后续具体 Runtime 适配器接管。
   */
  async upsertEffect(effect: EffectSpec): Promise<void> {
    this.effectMap.set(effect.id, effect)
  }

  /**
   * 从效果缓存中移除指定效果。
   */
  removeEffect(effectId: string): void {
    this.effectMap.delete(effectId)
  }

  /**
   * 更新对象可见性。
   * 基类只更新领域对象快照，真实引擎显隐同步由子类扩展。
   */
  setObjectVisible(objectId: string, visible: boolean): boolean {
    const current = this.objectMap.get(objectId)
    if (!current) return false
    if (current.visible === visible) return true
    const next = { ...current, visible }
    this.objectMap.set(objectId, next)
    this.syncSceneObjectSnapshot(next)
    this.objectComponents.upsertObject(next, { selectedObjectId: this.selectedObjectId })
    return true
  }

  /**
   * 将对象增量同步到 Runtime 自有的完整场景快照。
   *
   * 新对象追加到数组末尾；同编号对象在原位置替换，既保持稳定顺序，也保证随后到达的流式配置能在
   * `scene.objects` 中找到刚创建的对象。该方法只维护领域数据，不创建或释放任何引擎资源。
   */
  private syncSceneObjectSnapshot(object: SceneObject): void {
    if (!this.scene) return
    const index = this.objectSnapshotIndexById.get(object.id)
    if (index === undefined) {
      this.objectSnapshotIndexById.set(object.id, this.scene.objects.length)
      this.scene.objects.push(object)
      return
    }
    this.scene.objects[index] = object
  }

  /** 统一更新 Runtime 私有对象索引，供普通增量写入和按需依赖补全复用。 */
  private writeObjectSnapshot(object: SceneObject): void {
    this.objectMap.set(object.id, object)
    this.syncSceneObjectSnapshot(object)
    this.objectComponents.upsertObject(object, { selectedObjectId: this.selectedObjectId })
  }

  /**
   * 更新当前选中对象。
   * 只有对象缓存中存在的 id 才会被记录，传入 null 或无效 id 会清空选中状态。
   */
  setSelectedObject(objectId: string | null): void {
    this.selectedObjectId = objectId && this.objectMap.has(objectId) ? objectId : null
    this.objectComponents.setSelectedObject(this.selectedObjectId)
  }

  /**
   * 接收对象编辑／拖拽的临时流式保护意图。
   *
   * 基础 Runtime 没有用户模型区块调度器，因此这里刻意保持安全无操作；Three 和 Cesium Runtime
   * 会在 S018-B / S018-C 分别覆写并转成内部 pin。该默认实现既保证 Memory Runtime 和测试
   * Runtime 满足统一接口，也保证该临时意图不会污染场景对象、Store 或持久化数据。
   */
  setObjectStreamingInteraction(
    objectId: string,
    interaction: SceneObjectStreamingInteraction,
  ): void {
    void objectId
    void interaction
  }

  protected getObjectDirtyComponents(objectId: string): Set<RuntimeObjectComponentKind> {
    return this.objectComponents.getDirtyComponents(objectId)
  }

  protected consumeObjectDirtyComponents(objectId: string): Set<RuntimeObjectComponentKind> {
    return this.objectComponents.consumeDirtyComponents(objectId)
  }

  protected clearObjectDirtyComponents(objectId: string): void {
    this.objectComponents.clearDirty(objectId)
  }

  protected setObjectEngineMapping(
    objectId: string,
    engineObjectId: string,
    engineKind: string,
  ): void {
    this.objectComponents.setEngineMapping(objectId, engineObjectId, engineKind)
    this.notifyObjectMounted(objectId)
  }

  /**
   * 仅清理 Runtime 引擎映射，不删除 SceneObject 领域快照。
   * 子类在流式卸载远处实例时必须调用这个入口，真正删除对象才走 removeObject()。
   */
  protected clearObjectEngineMapping(objectId: string): void {
    this.objectComponents.clearEngineMapping(objectId)
    this.notifyObjectUnmounted(objectId)
  }

  protected getEngineObjectId(objectId: string): string | null {
    return this.objectComponents.getEngineObjectId(objectId)
  }

  protected getSceneObjectIdByEngineObject(
    engineObjectId: string,
    engineKind: string,
  ): string | null {
    return this.objectComponents.getSceneObjectId(engineObjectId, engineKind)
  }

  /**
   * 执行屏幕坐标拾取。
   * 基类不绑定具体渲染引擎，默认返回 null，真实 Runtime 需要覆盖该方法。
   */
  async pick(point: ScreenPoint): Promise<PickResult | null> {
    void point
    return null
  }

  /**
   * 解析屏幕点对应的世界坐标。
   *
   * 基类及不具备稳定世界坐标能力的 Runtime 明确返回 null，避免 UI 把局部默认值误写成 GIS
   * 经度、纬度和高程。Cesium Runtime 会覆盖该方法，将其内部引擎结果收敛为可序列化快照。
   */
  async pickWorldPosition(point: ScreenPoint): Promise<PickWorldPoint | null> {
    void point
    return null
  }

  /** 非 GIS 基础运行时没有数字高程模型，明确返回未支持，避免界面把局部坐标高度误当海拔。 */
  getTerrainSamplingCapabilities(): RuntimeTerrainSamplingCapabilities {
    return { availability: 'unavailable', reason: 'unsupported-runtime' }
  }

  /**
   * 基础运行时不提供地形采样。
   *
   * 使用拒绝态而不是返回零高程，保证调用方无法把“未支持”静默写成有效植被海拔。
   */
  async sampleTerrainHeights(
    _positions: readonly RuntimeTerrainSamplePosition[],
    _options?: RuntimeTerrainSamplingOptions,
  ): Promise<RuntimeTerrainHeightSample[]> {
    throw new Error('当前运行时不支持真实地形高程采样。')
  }

  /**
   * 聚焦场景或指定对象。
   * 基类不操作相机，子类可根据 target 调用真实引擎的聚焦能力。
   */
  async frame(target?: FrameTarget): Promise<void> {
    void target
  }

  /**
   * 写入当前相机状态。
   * 基类只保存领域相机快照，真实 Runtime 可覆盖并同步到底层引擎相机。
   */
  async setCamera(camera: SceneCameraState): Promise<void> {
    this.camera = camera
  }

  /**
   * 读取当前相机状态快照。
   */
  getCamera(): SceneCameraState {
    return this.camera
  }

  /**
   * 基类不接入具体引擎事件，提供空订阅以保持 Runtime 生命周期接口统一。
   * Cesium Runtime 会覆盖此方法并绑定真实的 camera.changed / moveEnd 事件。
   */
  subscribeCameraChanged(_listener: () => void): () => void {
    return () => {}
  }

  /**
   * 返回基类默认的流式状态快照。
   *
   * 基类没有 ChunkManager、资源缓存或引擎瓦片统计，因此两个通道都必须明确为未支持；
   * 不根据 SceneDefinition.streaming、对象数量或场景类型猜测加载状态。具体 Runtime 只有在
   * 已接入稳定统计采集时才应覆盖此方法，并把对应通道改为“已观测”或“未接入统计”。
   */
  getStreamingState(): RuntimeStreamingState {
    return createRuntimeStreamingState({
      platformChunks: { observation: 'unsupported' },
      nativeTiles: { observation: 'unsupported' },
    })
  }

  /** 基础运行时没有植被瓦片或批次实现，统一返回明确的未支持状态。 */
  getVegetationState(): RuntimeVegetationState {
    return createRuntimeVegetationState({ observation: 'unsupported' })
  }
}
