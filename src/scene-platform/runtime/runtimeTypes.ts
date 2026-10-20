import type { SceneType, VegetationQualityPreset } from '../core/types'

/**
 * 屏幕坐标。
 * 用于 Runtime pick / 交互工具等输入，不直接暴露引擎事件对象。
 */
export interface ScreenPoint {
  x: number
  y: number
}

/**
 * 场景对象的流式交互类型。
 *
 * 该类型只表达编辑器当前的交互意图，不暴露区块编号、固定保护句柄或 Cesium / Three
 * 引擎对象。编辑和拖拽必须分开上报，避免属性面板编辑与变换控件拖拽同时发生时互相覆盖。
 */
export type SceneObjectStreamingInteractionKind = 'editing' | 'dragging'

/**
 * 场景对象的一次临时流式交互状态变更。
 *
 * `active: true` 表示开始该交互，`active: false` 表示结束该交互。它只在编辑器、桥接层和
 * Runtime 之间同步；不得写入 SceneDefinition、SceneStore、撤销重做历史或 MySQL。后续
 * Runtime 会按 `kind` 将该意图映射为内部用户模型区块固定保护，但该内部实现不穿透到 UI。
 */
export interface SceneObjectStreamingInteraction {
  readonly kind: SceneObjectStreamingInteractionKind
  readonly active: boolean
}

export type PickHitType = 'object' | 'entity' | 'primitive' | 'model' | 'billboard' | 'unknown'

/**
 * 世界点的解析来源。
 *
 * `depth-buffer` 表示从当前已渲染表面的深度缓冲区还原，能保留模型、地表等可见表面的真实高度；
 * `globe` 与 `ellipsoid` 仅作为深度拾取不可用时的保守回退。该字段只描述本次坐标读取来源，
 * 不表示也不干预 Cesium 影像、地形或三维瓦片自身的加载、缓存与调度。
 */
export type PickWorldPointSource = 'depth-buffer' | 'globe' | 'ellipsoid' | 'raycaster' | 'unknown'

export interface PickWorldPoint {
  /** 命中点坐标语义，unknown 表示当前 Runtime 无法提供稳定世界点。 */
  kind: 'local' | 'geo' | 'unknown'
  /** 可序列化点位，local 为 [x, y, z]，geo 为 [longitude, latitude, height]。 */
  position?: Vector3Tuple
  /**
   * 本次世界点的只读解析来源。
   *
   * 对象拾取与拖拽落点共用这一快照类型；未提供来源时表示旧 Runtime 尚未采集，
   * 调用方不能据此把位置误判为引擎资源或持久化配置。
   */
  source?: PickWorldPointSource
}

/**
 * 地形采样使用的世界大地坐标系（WGS84）点。
 *
 * 这里只传递经纬度，不接受屏幕坐标、引擎地理坐标对象或调用方预填高程；最终高程必须由当前
 * Runtime 的真实地形提供器解析，避免把影像像素、三维建筑表面或椭球零高程误当成数字高程模型。
 */
export interface RuntimeTerrainSamplePosition {
  readonly longitude: number
  readonly latitude: number
}

/** 一条与输入顺序严格对应的地形采样结果，高程单位固定为米。 */
export interface RuntimeTerrainHeightSample extends RuntimeTerrainSamplePosition {
  readonly heightM: number
}

/**
 * 地形高程的垂直基准。
 *
 * `ellipsoid` 表示相对参考椭球，`orthometric` 表示相对平均海平面；提供器没有显式元数据时必须
 * 保持 `unknown`，不能仅凭服务厂商或地址猜测。未知基准可用于编辑预览，但不能直接通过植被发布门禁。
 */
export type RuntimeTerrainVerticalDatum = 'ellipsoid' | 'orthometric' | 'unknown'

/** 当前 Runtime 无法采样真实地形时的可诊断原因。 */
export type RuntimeTerrainSamplingUnavailableReason =
  | 'unsupported-runtime'
  | 'not-mounted'
  | 'ellipsoid-only'
  | 'terrain-unavailable'

/**
 * 当前 Runtime 的地形采样能力快照。
 *
 * `sourceId` 仅用于追溯配置来源，不包含鉴权参数；`sourceRevision` 缺失表示服务版本未冻结。浏览器
 * 能采样不等于发布可复现，生成端仍需同时校验已知垂直基准和稳定数据版本。
 */
export type RuntimeTerrainSamplingCapabilities =
  | {
      readonly availability: 'unavailable'
      readonly reason: RuntimeTerrainSamplingUnavailableReason
    }
  | {
      readonly availability: 'available'
      readonly sourceId: string | null
      readonly sourceRevision: string | null
      readonly verticalDatum: RuntimeTerrainVerticalDatum
      /** 单次公共调用允许的总点数上限；Runtime 内部仍会拆成更小网络批次。 */
      readonly maximumPointCount: number
      /** 推荐的网络批次大小，调用方无需自行循环拆分。 */
      readonly recommendedBatchSize: number
      /** 取消只能阻止后续批次并丢弃迟到结果，不能保证底层已发出的瓦片请求立即中止。 */
      readonly supportsResultCancellation: true
    }

/**
 * 地形采样调用选项。
 *
 * `batchSize` 主要供性能测试和低带宽环境收敛并发粒度；正常业务应使用 Runtime 推荐值。信号取消后
 * Runtime 必须停止后续批次，并在任何已发请求返回时再次检查，禁止把迟到高程写入新场景。
 */
export interface RuntimeTerrainSamplingOptions {
  readonly batchSize?: number
  readonly signal?: AbortSignal
}

/**
 * 拾取结果：返回统一的领域对象信息。
 *
 * 约束：
 * - objectId 是唯一必需字段，确保旧调用方仍可按领域对象 id 工作；
 * - screenPoint、point、hitType、distance、metadata 只保存可序列化命中信息；
 * - 不允许返回 THREE.Object3D、Cesium.Entity、Primitive 等真实引擎对象。
 */
export interface PickResult {
  /** 命中的领域对象 id。 */
  objectId: string
  /** 当前 Runtime 对应的场景类型。 */
  runtimeType: SceneType
  /** 屏幕拾取坐标快照。 */
  screenPoint: ScreenPoint
  /** 命中类型，用于后续拾取索引和调试，不暴露引擎对象。 */
  hitType: PickHitType
  /** 可选世界命中点。 */
  point?: PickWorldPoint
  /** 可选命中距离。 */
  distance?: number
  /** 可选可序列化元数据，禁止存放引擎对象引用。 */
  metadata?: Record<string, string | number | boolean | null>
}

/**
 * 创建统一拾取结果。
 *
 * 集中复制 screenPoint / point / metadata，避免 Runtime 把外部可变对象或引擎对象透传给上层。
 */
export function createPickResult(options: {
  objectId: string
  runtimeType: SceneType
  screenPoint: ScreenPoint
  hitType?: PickHitType
  point?: PickWorldPoint
  distance?: number
  metadata?: Record<string, string | number | boolean | null>
}): PickResult {
  const result: PickResult = {
    objectId: options.objectId,
    runtimeType: options.runtimeType,
    screenPoint: { ...options.screenPoint },
    hitType: options.hitType ?? 'unknown',
  }

  if (options.point) {
    const position = options.point.position
    const pointSnapshot: PickWorldPoint = {
      kind: options.point.kind,
      position: position ? [position[0], position[1], position[2]] : undefined,
    }
    /**
     * 保持旧快照的字段形状：未采集来源时不写入 `source: undefined`。
     * 这样既不破坏已有序列化比较，也能让新 GIS 拖拽在有来源时保留诊断信息。
     */
    if (options.point.source) pointSnapshot.source = options.point.source
    result.point = pointSnapshot
  }

  if (typeof options.distance === 'number') {
    result.distance = options.distance
  }

  if (options.metadata) {
    const metadata: Record<string, string | number | boolean | null> = {}
    for (const [key, value] of Object.entries(options.metadata)) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        metadata[key] = value
      }
    }
    result.metadata = metadata
  }

  return result
}

export type FrameTarget = { objectId: string } | { kind: 'scene' }

export type Vector3Tuple = [number, number, number]

/**
 * 相机状态的最小抽象。
 *
 * Three Runtime 使用 kind=three 保存相机位置、控制器目标点和透视相机参数；
 * 其他 Runtime 可继续返回 unknown，避免泄漏具体引擎对象。
 */
export type SceneCameraState =
  | { kind: 'unknown' }
  | {
      kind: 'three'
      position: Vector3Tuple
      target: Vector3Tuple
      fov: number
      near: number
      far: number
    }
  | {
      kind: 'cesium'
      destination: Vector3Tuple
      orientation?: {
        heading?: number
        pitch?: number
        roll?: number
      }
    }

/**
 * 流式通道的缓存统计。
 *
 * 数值以 Runtime 可稳定观测的实际单位返回：资源数量使用个数，内存与预算使用字节。
 * `null` 只允许出现在已观测通道中，表示该单项尚无可靠采集来源，不能用 `0` 伪装未知值。
 */
export interface RuntimeStreamingCacheState {
  /** 当前缓存内可复用资源的数量。 */
  readonly resourceCount: number | null
  /** 当前缓存的估算内存占用，单位为字节。 */
  readonly estimatedMemoryBytes: number | null
  /** 当前缓存预算，单位为字节。 */
  readonly memoryBudgetBytes: number | null
}

/**
 * 已完成稳定统计采集的流式通道状态。
 *
 * 平台自定义区块的计数单位是 `SceneChunk`，引擎原生通道的计数单位是瓦片；
 * 两类统计始终分通道保存，避免 Cesium 原生瓦片和普通场景对象互相混算。
 */
export interface RuntimeStreamingObservedChannelState {
  /** 当前通道已经可稳定采集统计。 */
  readonly observation: 'observed'
  /** 当前正在加载的区块或瓦片数量。 */
  readonly loadingCount: number | null
  /** 当前已加载完成的区块或瓦片数量。 */
  readonly loadedCount: number | null
  /** 当前可见的区块或瓦片数量。 */
  readonly visibleCount: number | null
  /** 当前被视锥或遮挡策略剔除的区块或瓦片数量。 */
  readonly culledCount: number | null
  /** 当前通道对应的缓存统计。 */
  readonly cache: RuntimeStreamingCacheState
}

/**
 * 单条流式通道的观测状态。
 *
 * - `unsupported`：Runtime 尚未实现该通道的流式或剔除行为；
 * - `not-instrumented`：Runtime 已有相关引擎行为，但当前没有稳定、可复用的统计采集；
 * - `observed`：Runtime 可返回加载、可见、剔除和缓存的瞬时快照。
 *
 * 通过可辨识联合表达“未支持”和“未知统计”，避免把无统计数据错误显示为零负载。
 */
export type RuntimeStreamingChannelState =
  | {
      readonly observation: 'unsupported'
    }
  | {
      readonly observation: 'not-instrumented'
    }
  | RuntimeStreamingObservedChannelState

/**
 * Runtime 流式状态的只读快照。
 *
 * `platformChunks` 只描述平台定义的 `SceneChunk`；`nativeTiles` 只描述 Cesium 等引擎的
 * 原生瓦片。此类型不包含队列实例、缓存对象、Mesh、Entity 或 Tileset，保证可跨 Runtime
 * 传递且不会泄漏引擎实现。
 */
export interface RuntimeStreamingState {
  /** 平台自定义 SceneChunk 的流式与剔除统计通道。 */
  readonly platformChunks: RuntimeStreamingChannelState
  /** 引擎原生影像、地形和 3D Tiles 等瓦片的统计通道。 */
  readonly nativeTiles: RuntimeStreamingChannelState
}

/**
 * 植被运行时已经接入稳定观测后的状态。
 *
 * 图层数量描述场景级植被发布单元，瓦片数量描述引擎原生三维瓦片；二者不能与普通用户模型区块
 * 混算。无法从公开引擎事件稳定获取的单项使用 null，禁止读取 Cesium 私有统计字段伪造精确值。
 */
export interface RuntimeVegetationObservedState {
  readonly observation: 'observed'
  /** 植被系统与其流式开关是否同时启用。 */
  readonly enabled: boolean
  readonly layerCount: number
  readonly loadingLayerCount: number
  readonly loadedLayerCount: number
  readonly failedLayerCount: number
  readonly loadedTileCount: number | null
  readonly visibleTileCount: number | null
  readonly pendingRequestCount: number | null
  readonly processingTileCount: number | null
  readonly failedTileCount: number | null
  /** 植被专属总缓存预算，单位为字节；不会覆盖普通场景模型的流式预算。 */
  readonly memoryBudgetBytes: number
  /** Cesium 公开接口没有稳定的实际显存统计时保持 null。 */
  readonly estimatedMemoryBytes: number | null
}

/**
 * 植被运行状态。
 *
 * 未提供植被定义或当前 Runtime 不支持植被时返回 unsupported；只要已识别植被定义，即使系统关闭或
 * 某个清单加载失败也返回 observed，使诊断界面能够准确区分“未配置”和“配置后失败”。
 */
export type RuntimeVegetationState =
  | {
      readonly observation: 'unsupported'
    }
  | RuntimeVegetationObservedState

/** 创建与外部引用隔离的植被运行状态快照。 */
export function createRuntimeVegetationState(
  state: RuntimeVegetationState,
): RuntimeVegetationState {
  return state.observation === 'unsupported' ? { observation: 'unsupported' } : { ...state }
}

/** 铯引擎编辑态植被预览的异步阶段。 */
export type RuntimeVegetationPreviewStatus = 'idle' | 'generating' | 'ready' | 'failed'

/** 编辑预览按规则/分带/物种汇总的稳定计数；不暴露 Cesium 模型或候选实例引用。 */
export interface RuntimeVegetationPreviewBreakdown {
  readonly ruleId: string
  readonly zoneId: string | null
  readonly speciesId: string
  readonly candidateCount: number
  readonly instanceCount: number
}

/**
 * 植被预览运行状态。
 *
 * 该快照只统计受数量上限保护的编辑态临时模型，不包含正式三维瓦片实例；`candidateCount` 是地形
 * 过滤前的候选点数量，便于区分“没有生成候选点”和“候选点不满足海拔或坡度”两类结果。
 */
export type RuntimeVegetationPreviewState =
  | {
      readonly observation: 'unsupported'
    }
  | {
      readonly observation: 'observed'
      readonly status: RuntimeVegetationPreviewStatus
      readonly instanceCount: number
      readonly candidateCount: number
      readonly truncated: boolean
      readonly message: string | null
      /** 多海拔带、多物种诊断；总 candidateCount 仍用于定位无实例时的过滤阶段。 */
      readonly breakdown?: readonly RuntimeVegetationPreviewBreakdown[]
    }

/** 创建与控制器内部引用隔离的植被预览状态。 */
export function createRuntimeVegetationPreviewState(
  state: RuntimeVegetationPreviewState,
): RuntimeVegetationPreviewState {
  if (state.observation === 'unsupported') return { observation: 'unsupported' }
  const snapshot = { ...state }
  /** 诊断明细是可变数组，必须复制数组和条目，避免面板误改 Runtime 内部缓存。 */
  if (state.breakdown) snapshot.breakdown = state.breakdown.map((entry) => ({ ...entry }))
  return snapshot
}

/**
 * 编辑预览性能诊断；只保存计数，不暴露模型、图元、任务句柄或地形缓存对象。
 * 这些数据用于定位“视锥外少绘制”和“过期资源是否真正回收”，不进入场景存档。
 */
export interface RuntimeVegetationPreviewDiagnostics {
  readonly activeGroupCount: number
  readonly retainedGroupCount: number
  readonly activeModelCount: number
  readonly pendingModelCount: number
  readonly pendingTaskCount: number
  readonly cancelledTaskCount: number
  readonly releasedModelCount: number
}

/** 正式植被瓦片性能诊断；公开接口不可提供的实际内存字段必须保持 null。 */
export interface RuntimeVegetationTilesetDiagnostics {
  readonly layerCount: number
  readonly loadedLayerCount: number
  readonly loadingLayerCount: number
  readonly failedLayerCount: number
  readonly distanceHiddenLayerCount: number
  readonly loadedTileCount: number | null
  readonly visibleTileCount: number | null
  readonly pendingRequestCount: number | null
  readonly processingTileCount: number | null
  readonly memoryBudgetBytes: number
  readonly estimatedMemoryBytes: number | null
  /** 当前运行时实际使用的业务密度档位；旧单入口无法确认比例时密度比例保持空值。 */
  readonly densityPreset: VegetationQualityPreset | null
  /** 当前档位对应的发布目标比例；旧单入口发布无法可靠推断时保持 null。 */
  readonly densityRatio: number | null
  /** 当前入口来自三档发布入口还是历史单入口。 */
  readonly densitySource: 'published-density-entry' | 'legacy-single-entry' | 'none'
  /** 当前发布包已具备的完整密度档位；只返回稳定业务枚举，不暴露入口地址。 */
  readonly availableDensityPresets: readonly VegetationQualityPreset[]
}

/** 植被自动性能调节快照；仅描述档位和时间窗口，不暴露调节器实例或定时器。 */
export interface RuntimeVegetationPerformanceDiagnostics {
  readonly userPreset: VegetationQualityPreset
  readonly activePreset: VegetationQualityPreset
  readonly automatic: boolean
  readonly lowSinceMs: number | null
  readonly highSinceMs: number | null
  readonly lastChangeAtMs: number | null
}

/** 植被两条运行时通道的只读性能快照；普通模型和天气统计不得混入。 */
export interface RuntimeVegetationDiagnostics {
  readonly preview: RuntimeVegetationPreviewDiagnostics
  readonly tileset: RuntimeVegetationTilesetDiagnostics
  /** 旧 Runtime 可以缺省；Cesium 植被控制器接入自动调节后提供该字段。 */
  readonly performance?: RuntimeVegetationPerformanceDiagnostics
}

/**
 * 创建独立的 Runtime 流式状态快照。
 *
 * Runtime 查询会在高频诊断读取中重复调用此函数，因此只复制固定深度的值对象，复杂度恒为 O(1)。
 * 每次都返回新的嵌套对象，调用方即使错误修改返回值，也不会污染 Runtime 内部统计或后续查询结果。
 */
export function createRuntimeStreamingState(state: RuntimeStreamingState): RuntimeStreamingState {
  return {
    platformChunks: cloneRuntimeStreamingChannelState(state.platformChunks),
    nativeTiles: cloneRuntimeStreamingChannelState(state.nativeTiles),
  }
}

/**
 * 复制单个流式通道，已观测通道需要继续复制缓存摘要；未支持和未接入统计通道只保留辨识字段。
 */
function cloneRuntimeStreamingChannelState(
  state: RuntimeStreamingChannelState,
): RuntimeStreamingChannelState {
  if (state.observation !== 'observed') {
    return { observation: state.observation }
  }

  return {
    observation: 'observed',
    loadingCount: state.loadingCount,
    loadedCount: state.loadedCount,
    visibleCount: state.visibleCount,
    culledCount: state.culledCount,
    cache: {
      resourceCount: state.cache.resourceCount,
      estimatedMemoryBytes: state.cache.estimatedMemoryBytes,
      memoryBudgetBytes: state.cache.memoryBudgetBytes,
    },
  }
}
