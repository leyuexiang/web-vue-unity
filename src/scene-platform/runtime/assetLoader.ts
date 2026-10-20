import type { AssetKind, AssetRef } from '../core/types'

/**
 * 资产加载状态。
 *
 * 说明：
 * - success 表示已经拿到可交给 Runtime 对象适配器使用的资源句柄；
 * - failure 表示加载失败，但错误已经被结构化，调用方可以识别失败类型并决定降级策略。
 */
export type AssetLoadStatus = 'success' | 'failure'

/**
 * 资产加载错误分类。
 *
 * 这些分类只表达 Runtime 层可执行的决策，不绑定具体网络库或引擎异常：
 * - unsupported-kind：当前加载器不支持该资产类型；
 * - invalid-source：资产地址或必需字段缺失；
 * - not-found：资源不存在或宿主项目无法解析；
 * - network-error：远程请求失败；
 * - timeout：超过 Runtime 为本次加载设置的最长等待时间；
 * - aborted：对象被删除、替换或 Runtime 销毁而主动取消；
 * - decode-error：资源存在但无法被引擎解析；
 * - unknown：无法进一步归类的错误。
 */
export type AssetLoadErrorCode =
  | 'unsupported-kind'
  | 'invalid-source'
  | 'not-found'
  | 'network-error'
  | 'timeout'
  | 'aborted'
  | 'decode-error'
  | 'unknown'

/**
 * 可释放资产句柄。
 *
 * 约束：
 * - resource 只能在 Runtime 或 Adapter 内部使用，不允许进入 Store 或保存数据；
 * - dispose 必须释放纹理、几何体、材质、事件监听等对象级资源；
 * - dispose 需要幂等，重复调用不应抛错。
 */
export interface DisposableAssetHandle<TResource = unknown> {
  /** 对应的可序列化资产引用。 */
  asset: AssetRef
  /** Runtime 内部使用的真实资源，例如 Three 纹理、GLTF 场景、Cesium Tileset。 */
  resource: TResource
  /** 释放当前资产持有的运行时资源。 */
  dispose: () => void
}

/**
 * 结构化资产加载错误。
 *
 * 用途：让 Runtime 可以按错误类型记录日志、展示降级状态或跳过单个对象，
 * 避免不同加载器把原始异常直接抛给 UI 层。
 */
export interface AssetLoadError {
  /** 失败资产。 */
  asset: AssetRef
  /** 可识别错误类型。 */
  code: AssetLoadErrorCode
  /** 面向日志和调试的错误说明。 */
  message: string
  /** 原始错误，仅限 Runtime 内部调试使用，不应序列化保存。 */
  cause?: unknown
}

/**
 * 资产加载成功结果。
 */
export interface AssetLoadSuccess<TResource = unknown> {
  status: 'success'
  handle: DisposableAssetHandle<TResource>
}

/**
 * 资产加载失败结果。
 */
export interface AssetLoadFailure {
  status: 'failure'
  error: AssetLoadError
}

/**
 * 资产加载结果。
 *
 * 设计为判别联合，调用方可以先判断 status，再安全读取 handle 或 error。
 */
export type AssetLoadResult<TResource = unknown> =
  | AssetLoadSuccess<TResource>
  | AssetLoadFailure

/**
 * Runtime 资产加载器上下文。
 *
 * host 由具体 Runtime 注入，可以是 Three 加载器集合、Cesium Viewer 或测试桩；
 * 公共接口不假设宿主类型，避免把具体引擎依赖扩散到核心层。
 */
export interface AssetLoaderContext<THost = unknown> {
  /** 具体 Runtime 内部的最小宿主接口。 */
  host: THost
  /** 对象删除、替换或 Runtime 销毁时用于终止加载的信号。 */
  signal?: AbortSignal
  /** 单次加载最长等待时间，加载器应在超时后返回 timeout。 */
  timeoutMs?: number
}

/**
 * Runtime 资产加载器接口。
 *
 * 职责：
 * - 判断是否支持某类 AssetRef；
 * - 加载模型、图片等资源并返回可释放句柄；
 * - 失败时返回结构化错误，便于 Runtime 统一降级和日志记录。
 */
export interface AssetLoader<THost = unknown, TResource = unknown> {
  /** 加载器名称，用于日志和测试定位。 */
  readonly name: string
  /** 当前加载器支持的资产类型集合。 */
  readonly supportedKinds: readonly AssetKind[]
  /** 判断当前加载器是否支持指定资产。 */
  canLoad: (asset: AssetRef) => boolean
  /** 执行资产加载，成功返回可释放句柄，失败返回结构化错误。 */
  load: (
    asset: AssetRef,
    context: AssetLoaderContext<THost>,
  ) => Promise<AssetLoadResult<TResource>>
}

/**
 * 创建可释放资产句柄。
 *
 * dispose 由调用方传入，便于不同 Runtime 精确释放自己的资源；
 * 不在这里包一层空释放逻辑，避免隐藏真实释放缺失问题。
 */
export function createDisposableAssetHandle<TResource>(options: {
  asset: AssetRef
  resource: TResource
  dispose: () => void
}): DisposableAssetHandle<TResource> {
  let disposed = false
  return {
    asset: options.asset,
    resource: options.resource,
    dispose: () => {
      if (disposed) return
      disposed = true
      options.dispose()
    },
  }
}

/**
 * 创建资产加载成功结果。
 */
export function createAssetLoadSuccess<TResource>(
  handle: DisposableAssetHandle<TResource>,
): AssetLoadSuccess<TResource> {
  return {
    status: 'success',
    handle,
  }
}

/**
 * 创建资产加载失败结果。
 *
 * 这里集中生成 failure 结构，保证所有加载器返回相同的错误字段。
 */
export function createAssetLoadFailure(options: {
  asset: AssetRef
  code: AssetLoadErrorCode
  message: string
  cause?: unknown
}): AssetLoadFailure {
  const error: AssetLoadError = {
    asset: options.asset,
    code: options.code,
    message: options.message,
  }

  if (options.cause !== undefined) {
    error.cause = options.cause
  }

  return {
    status: 'failure',
    error,
  }
}

/**
 * 创建基于资产类型集合的支持判断函数。
 *
 * 内部使用 Set 做常数级查询，避免加载器在高频对象同步时反复遍历类型数组。
 */
export function createAssetKindMatcher(kinds: readonly AssetKind[]): (asset: AssetRef) => boolean {
  const supportedKinds = new Set(kinds)
  return (asset) => supportedKinds.has(asset.kind)
}
