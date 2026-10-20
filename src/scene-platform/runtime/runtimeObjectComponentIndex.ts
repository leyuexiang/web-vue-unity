import type { AssetRef, SceneObject } from '../core/types'

export type RuntimeObjectComponentKind =
  | 'transform'
  | 'visibility'
  | 'asset'
  | 'style'
  | 'geometryOffset'
  | 'visualConfig'
  | 'selection'
  | 'pickable'
  | 'engineMapping'

export interface RuntimeEngineObjectMapping {
  objectId: string
  engineObjectId: string
  engineKind: string
}

export interface RuntimeObjectComponentSnapshot {
  objectId: string
  transformKey: string
  visible: boolean
  assetKey: string
  /** 样式独立建模，避免透明度变化被错误视为资产替换。 */
  styleKey: string | null
  /** 几何偏移独立建模，避免 metadata.offset 触发纯资产对象重载。 */
  geometryOffsetKey: string | null
  /** 图片、标注、打点面板配置独立建模，避免文本或绑定资源编辑被错误识别为资源替换。 */
  visualConfigKey: string | null
  selected: boolean
  pickable: boolean
  engineMappingKey: string | null
}

export interface RuntimeObjectComponentOptions {
  selectedObjectId?: string | null
  pickable?: boolean
}

/**
 * Runtime 内部对象组件索引。
 *
 * 只保存领域对象编号、引擎对象编号和可序列化快照，不保存 THREE / Cesium 对象引用。
 */
export class RuntimeObjectComponentIndex {
  private readonly snapshots = new Map<string, RuntimeObjectComponentSnapshot>()
  private readonly dirtyComponents = new Map<string, Set<RuntimeObjectComponentKind>>()
  private readonly objectToEngine = new Map<string, RuntimeEngineObjectMapping>()
  private readonly engineToObject = new Map<string, string>()

  replaceObjects(objects: readonly SceneObject[], selectedObjectId: string | null = null): void {
    this.snapshots.clear()
    this.dirtyComponents.clear()
    this.objectToEngine.clear()
    this.engineToObject.clear()

    objects.forEach((object) => {
      this.upsertObject(object, { selectedObjectId })
      this.clearDirty(object.id)
    })
  }

  upsertObject(
    object: SceneObject,
    options: RuntimeObjectComponentOptions = {},
  ): Set<RuntimeObjectComponentKind> {
    const next = this.createSnapshot(object, options)
    const previous = this.snapshots.get(object.id)
    const dirty = this.diffSnapshots(previous, next)

    this.snapshots.set(object.id, next)
    this.markDirty(object.id, dirty)

    return new Set(dirty)
  }

  setEngineMapping(objectId: string, engineObjectId: string, engineKind: string): void {
    const existing = this.objectToEngine.get(objectId)
    if (existing) {
      this.engineToObject.delete(
        this.createEngineLookupKey(existing.engineKind, existing.engineObjectId),
      )
    }

    const mapping: RuntimeEngineObjectMapping = { objectId, engineObjectId, engineKind }
    this.objectToEngine.set(objectId, mapping)
    this.engineToObject.set(this.createEngineLookupKey(engineKind, engineObjectId), objectId)

    const snapshot = this.snapshots.get(objectId)
    const nextKey = this.createEngineMappingKey(mapping)
    if (snapshot && snapshot.engineMappingKey !== nextKey) {
      snapshot.engineMappingKey = nextKey
      this.markDirty(objectId, new Set(['engineMapping']))
    }
  }

  /**
   * 只清除领域对象与引擎实例的双向映射，保留对象快照、脏字段和选择状态。
   *
   * 流式卸载只是临时释放远处 Object3D，SceneObject 仍须留在 BaseSceneRuntime.objectMap 中，
   * 因此不能复用 deleteObject()；否则场景保存和相机回到该区域后的重新加载都会丢失领域数据。
   */
  clearEngineMapping(objectId: string): void {
    const mapping = this.objectToEngine.get(objectId)
    if (!mapping) return

    this.objectToEngine.delete(objectId)
    this.engineToObject.delete(this.createEngineLookupKey(mapping.engineKind, mapping.engineObjectId))

    const snapshot = this.snapshots.get(objectId)
    if (snapshot && snapshot.engineMappingKey !== null) {
      snapshot.engineMappingKey = null
      this.markDirty(objectId, new Set(['engineMapping']))
    }
  }

  deleteObject(objectId: string): void {
    const mapping = this.objectToEngine.get(objectId)
    if (mapping) {
      this.engineToObject.delete(
        this.createEngineLookupKey(mapping.engineKind, mapping.engineObjectId),
      )
      this.objectToEngine.delete(objectId)
    }
    this.snapshots.delete(objectId)
    this.dirtyComponents.delete(objectId)
  }

  setSelectedObject(selectedObjectId: string | null): Set<string> {
    const changedObjectIds = new Set<string>()
    for (const snapshot of this.snapshots.values()) {
      const selected = snapshot.objectId === selectedObjectId
      if (snapshot.selected !== selected) {
        snapshot.selected = selected
        this.markDirty(snapshot.objectId, new Set(['selection']))
        changedObjectIds.add(snapshot.objectId)
      }
    }
    return changedObjectIds
  }

  getEngineObjectId(objectId: string): string | null {
    return this.objectToEngine.get(objectId)?.engineObjectId ?? null
  }

  getSceneObjectId(engineObjectId: string, engineKind: string): string | null {
    return this.engineToObject.get(this.createEngineLookupKey(engineKind, engineObjectId)) ?? null
  }

  getSnapshot(objectId: string): RuntimeObjectComponentSnapshot | null {
    const snapshot = this.snapshots.get(objectId)
    return snapshot ? { ...snapshot } : null
  }

  /** 返回对象当前是否允许被拾取；对象不存在时返回 false。 */
  isPickable(objectId: string): boolean {
    return this.snapshots.get(objectId)?.pickable ?? false
  }

  /** 返回对象当前是否可见；对象不存在时返回 false。 */
  isVisible(objectId: string): boolean {
    return this.snapshots.get(objectId)?.visible ?? false
  }

  getDirtyComponents(objectId: string): Set<RuntimeObjectComponentKind> {
    return new Set(this.dirtyComponents.get(objectId) ?? [])
  }

  consumeDirtyComponents(objectId: string): Set<RuntimeObjectComponentKind> {
    const dirty = this.getDirtyComponents(objectId)
    this.clearDirty(objectId)
    return dirty
  }

  clearDirty(objectId: string): void {
    this.dirtyComponents.delete(objectId)
  }

  clear(): void {
    this.snapshots.clear()
    this.dirtyComponents.clear()
    this.objectToEngine.clear()
    this.engineToObject.clear()
  }

  private createSnapshot(
    object: SceneObject,
    options: RuntimeObjectComponentOptions,
  ): RuntimeObjectComponentSnapshot {
    const mapping = this.objectToEngine.get(object.id)
    return {
      objectId: object.id,
      transformKey: stableSerialize(object.transform),
      visible: object.visible,
      assetKey: stableSerialize(createAssetComponentSnapshot(object.asset, object.metadata)),
      styleKey: object.style ? stableSerialize(object.style) : null,
      geometryOffsetKey: createGeometryOffsetKey(object.metadata),
      visualConfigKey: createVisualConfigKey(object.metadata, object.billboard),
      selected: options.selectedObjectId === object.id,
      pickable: resolvePickable(object, options.pickable),
      engineMappingKey: mapping ? this.createEngineMappingKey(mapping) : null,
    }
  }

  private diffSnapshots(
    previous: RuntimeObjectComponentSnapshot | undefined,
    next: RuntimeObjectComponentSnapshot,
  ): Set<RuntimeObjectComponentKind> {
    if (!previous) {
      /**
       * 初次同步只在对象实际携带样式时标记 style，避免无样式对象多一次材质树遍历。
       * 资产、样式、几何偏移和面板视觉配置分别标记，因此后续只改透明、offset 或标注文本
       * 都不会触发 AssetRef 重载。
       */
      return new Set([
        'transform',
        'visibility',
        'asset',
        ...(next.styleKey ? (['style'] as const) : []),
        ...(next.geometryOffsetKey ? (['geometryOffset'] as const) : []),
        ...(next.visualConfigKey ? (['visualConfig'] as const) : []),
        'selection',
        'pickable',
        'engineMapping',
      ])
    }

    const dirty = new Set<RuntimeObjectComponentKind>()
    if (previous.transformKey !== next.transformKey) dirty.add('transform')
    if (previous.visible !== next.visible) dirty.add('visibility')
    if (previous.assetKey !== next.assetKey) dirty.add('asset')
    if (previous.styleKey !== next.styleKey) dirty.add('style')
    if (previous.geometryOffsetKey !== next.geometryOffsetKey) dirty.add('geometryOffset')
    if (previous.visualConfigKey !== next.visualConfigKey) dirty.add('visualConfig')
    if (previous.selected !== next.selected) dirty.add('selection')
    if (previous.pickable !== next.pickable) dirty.add('pickable')
    if (previous.engineMappingKey !== next.engineMappingKey) dirty.add('engineMapping')
    return dirty
  }

  private markDirty(objectId: string, dirty: Set<RuntimeObjectComponentKind>): void {
    if (dirty.size === 0) return
    const current = this.dirtyComponents.get(objectId) ?? new Set<RuntimeObjectComponentKind>()
    dirty.forEach((component) => current.add(component))
    this.dirtyComponents.set(objectId, current)
  }

  private createEngineMappingKey(mapping: RuntimeEngineObjectMapping): string {
    return this.createEngineLookupKey(mapping.engineKind, mapping.engineObjectId)
  }

  private createEngineLookupKey(engineKind: string, engineObjectId: string): string {
    return `${engineKind}:${engineObjectId}`
  }
}

function createAssetComponentSnapshot(
  asset: AssetRef | undefined,
  metadata: SceneObject['metadata'],
) {
  /**
   * offset 只影响已加载模型的顶点局部坐标，不影响资产来源、加载器或资源句柄。图片和标注
   * 面板配置同样只影响已有运行时对象的外观。四者都必须从资产快照排除，否则纯 AssetRef
   * 对象编辑属性会被 Three Runtime 当作换模型并重新发起加载。
   */
  const {
    offset: _geometryOffset,
    imagePanelConfig: _imagePanelConfig,
    annotationPanelConfig: _annotationPanelConfig,
    markingPanelConfig: _markingPanelConfig,
    ...assetMetadata
  } = metadata ?? {}
  return {
    asset: asset ?? null,
    metadata: Object.keys(assetMetadata).length > 0 ? assetMetadata : null,
  }
}

/** 将兼容旧数据的 metadata.offset 规范成稳定脏标记；非法历史值只跳过运行时更新。 */
function createGeometryOffsetKey(metadata: SceneObject['metadata']): string | null {
  const offset = metadata?.offset
  if (!offset || typeof offset !== 'object') return null
  const { x, y, z } = offset as Partial<{ x: unknown; y: unknown; z: unknown }>
  if (![x, y, z].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null
  }
  return stableSerialize([x, y, z])
}

/**
 * 只提取由本地 Three Runtime 可等价消费的三类面板配置。
 *
 * metadata 仍允许承载其它业务字段，但它们必须继续归入原有 asset 快照并同步 userData；这里
 * 不能序列化整份 metadata，否则设备编号、交互规则的小改动会重复创建图片纹理或标注画布。
 */
function createVisualConfigKey(metadata: SceneObject['metadata'], billboard?: unknown): string | null {
  const imagePanelConfig = metadata?.imagePanelConfig
  const annotationPanelConfig = metadata?.annotationPanelConfig
  const markingPanelConfig = metadata?.markingPanelConfig
  const hasMetadataConfig =
    imagePanelConfig !== undefined
    || annotationPanelConfig !== undefined
    || markingPanelConfig !== undefined
  const hasBillboard = billboard !== undefined

  if (!hasMetadataConfig && !hasBillboard) {
    return null
  }

  return stableSerialize({
    imagePanelConfig: imagePanelConfig ?? null,
    annotationPanelConfig: annotationPanelConfig ?? null,
    markingPanelConfig: markingPanelConfig ?? null,
    /**
     * 三维看板的富文本与外观配置同样属于“对象外观”：变更只需重绘画布和刷新纹理，
     * 不涉及资产替换。把它放在 visualConfigKey 里，可以保证编辑标题、段落或背景时
     * 只触发外观刷新，不会被误判为换模型。
     */
    billboard: billboard ?? null,
  })
}

function resolvePickable(object: SceneObject, optionPickable: boolean | undefined): boolean {
  if (typeof optionPickable === 'boolean') return optionPickable
  const metadataPickable = object.metadata?.pickable
  /**
   * 新对象由 metadata.pickable 明确控制 Runtime 拾取；旧场景尚未补该字段时，
   * 继续使用领域模型既有的 locked 反向推导。这样历史场景不会因字段迁移而突然可拾取。
   */
  return typeof metadataPickable === 'boolean' ? metadataPickable : !object.locked
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeStable(value))
}

function normalizeStable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStable(item))
  }
  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = normalizeStable((value as Record<string, unknown>)[key])
      return result
    }, {})
}
