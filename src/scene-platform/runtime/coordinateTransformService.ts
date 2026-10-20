import type {
  GeoTransform,
  LocalTransform,
  SceneCoordinateSystem,
  SceneTransform,
} from '../core/types'

/**
 * 运行时坐标类型。
 *
 * 说明：
 * - local 表示本地三维坐标，通常对应编辑器局部空间；
 * - geo 表示地理坐标，通常对应经纬高；
 * - 这里只描述坐标语义，不绑定 Three.Vector3、Cesium.Cartesian3 等引擎对象。
 */
export type RuntimeCoordinateKind = SceneTransform['kind']

/**
 * 坐标转换错误类型。
 *
 * 这些错误只表达平台层可识别的失败原因，避免 Runtime 把引擎异常直接抛给组件。
 */
export type CoordinateTransformErrorCode =
  | 'unsupported-transform-kind'
  | 'incompatible-coordinate-system'
  | 'invalid-coordinate'
  | 'unknown'

/**
 * 运行时坐标快照。
 *
 * 约束：
 * - position、rotation、scale 必须是可序列化或引擎中立的数据；
 * - 不允许保存 Three、Cesium 或 DOM 实例；
 * - 具体 Runtime 可以在内部把该快照继续转换为引擎对象。
 */
export interface RuntimeCoordinateSnapshot<TPosition = unknown> {
  /** 坐标语义类型，用于区分本地三维坐标和 GIS 经纬高。 */
  kind: RuntimeCoordinateKind
  /** 引擎中立的位置快照，例如 [x, y, z] 或 [longitude, latitude, height]。 */
  position: TPosition
  /** 可选旋转快照，本地三维为欧拉角，GIS 为 heading/pitch/roll。 */
  rotation?: [number, number, number]
  /** 可选缩放快照，统一展开为三元组，避免 Runtime 重复判断 number 或数组。 */
  scale?: [number, number, number]
  /** 原始领域变换，便于 fromRuntime 无损恢复未被 Runtime 改写的字段。 */
  sourceTransform?: SceneTransform
}

/**
 * 坐标转换上下文。
 *
 * host 只允许 Runtime 内部传入最小宿主接口；公共层不得依赖真实引擎对象。
 */
export interface CoordinateTransformContext<THost = unknown> {
  /** 当前 Runtime 的最小宿主接口。 */
  host: THost
  /** 当前场景坐标系统，用于检查 local / geo 是否混用。 */
  coordinateSystem?: SceneCoordinateSystem
}

/**
 * 结构化坐标转换错误。
 */
export interface CoordinateTransformError {
  /** 失败原因编码，调用方可据此决定降级或提示。 */
  code: CoordinateTransformErrorCode
  /** 面向日志和调试的错误说明。 */
  message: string
  /** 触发失败的领域变换。 */
  transform?: SceneTransform
  /** 原始错误，仅限 Runtime 内部调试使用。 */
  cause?: unknown
}

/**
 * 坐标转换成功结果。
 */
export interface CoordinateTransformSuccess<TPosition = unknown> {
  status: 'success'
  value: RuntimeCoordinateSnapshot<TPosition>
}

/**
 * 坐标转换失败结果。
 */
export interface CoordinateTransformFailure {
  status: 'failure'
  error: CoordinateTransformError
}

/**
 * 坐标转换结果。
 *
 * 使用判别联合，调用方先判断 status，再读取 value 或 error，避免异常分支散落到组件。
 */
export type CoordinateTransformResult<TPosition = unknown> =
  | CoordinateTransformSuccess<TPosition>
  | CoordinateTransformFailure

/**
 * 坐标转换服务接口。
 *
 * 职责：
 * - 把领域层 SceneTransform 转为 Runtime 可消费的引擎中立坐标快照；
 * - 把 Runtime 快照还原为领域层 SceneTransform；
 * - 统一处理 local / geo 坐标系统不匹配和非法坐标错误。
 */
export interface CoordinateTransformService<THost = unknown, TPosition = unknown> {
  /** 服务名称，用于日志和测试定位。 */
  readonly name: string
  /** 判断当前服务是否支持指定领域变换。 */
  canTransform: (transform: SceneTransform) => boolean
  /** 领域变换转运行时坐标快照。 */
  toRuntime: (
    transform: SceneTransform,
    context: CoordinateTransformContext<THost>,
  ) => Promise<CoordinateTransformResult<TPosition>>
  /** 运行时坐标快照转领域变换。 */
  fromRuntime: (
    snapshot: RuntimeCoordinateSnapshot<TPosition>,
    context: CoordinateTransformContext<THost>,
  ) => Promise<CoordinateTransformResult<TPosition>>
}

/**
 * 创建坐标转换成功结果。
 */
export function createCoordinateTransformSuccess<TPosition>(
  value: RuntimeCoordinateSnapshot<TPosition>,
): CoordinateTransformSuccess<TPosition> {
  return {
    status: 'success',
    value,
  }
}

/**
 * 创建坐标转换失败结果。
 *
 * 统一错误结构，避免不同 Runtime 返回互不兼容的失败字段。
 */
export function createCoordinateTransformFailure(options: {
  code: CoordinateTransformErrorCode
  message: string
  transform?: SceneTransform
  cause?: unknown
}): CoordinateTransformFailure {
  const error: CoordinateTransformError = {
    code: options.code,
    message: options.message,
  }

  if (options.transform) {
    error.transform = options.transform
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
 * 将缩放统一展开为三元组。
 *
 * 这样 Runtime 后续同步对象时不需要反复判断 number 或数组，减少重复分支。
 */
export function normalizeTransformScale(scale: SceneTransform['scale']): [number, number, number] {
  return Array.isArray(scale) ? scale : [scale, scale, scale]
}

/**
 * 校验领域变换是否匹配场景坐标系统。
 *
 * local 场景只能使用 local transform，wgs84 场景只能使用 geo transform；
 * 没传 coordinateSystem 时不强制失败，便于纯接口测试和渐进接入。
 */
export function validateTransformCoordinateSystem(
  transform: SceneTransform,
  coordinateSystem?: SceneCoordinateSystem,
): CoordinateTransformFailure | null {
  if (!coordinateSystem) return null

  if (coordinateSystem.kind === 'local' && transform.kind !== 'local') {
    return createCoordinateTransformFailure({
      code: 'incompatible-coordinate-system',
      message: '本地三维场景只能使用 local 坐标变换。',
      transform,
    })
  }

  if (coordinateSystem.kind === 'wgs84' && transform.kind !== 'geo') {
    return createCoordinateTransformFailure({
      code: 'incompatible-coordinate-system',
      message: 'GIS 场景只能使用 geo 经纬高坐标变换。',
      transform,
    })
  }

  return null
}

/**
 * 创建本地三维坐标快照。
 *
 * 该函数只返回数组和领域快照，不创建 Three.Vector3，保证公共层不泄漏引擎对象。
 */
export function createLocalRuntimeCoordinateSnapshot(
  transform: LocalTransform,
): RuntimeCoordinateSnapshot<[number, number, number]> {
  return {
    kind: 'local',
    position: transform.position,
    rotation: transform.rotation,
    scale: normalizeTransformScale(transform.scale),
    sourceTransform: transform,
  }
}

/**
 * 创建 GIS 经纬高坐标快照。
 *
 * position 采用 [longitude, latitude, height] 顺序，避免各 Runtime 重复拼装经纬高数组。
 */
export function createGeoRuntimeCoordinateSnapshot(
  transform: GeoTransform,
): RuntimeCoordinateSnapshot<[number, number, number]> {
  return {
    kind: 'geo',
    position: [transform.longitude, transform.latitude, transform.height],
    rotation: [transform.heading, transform.pitch, transform.roll],
    scale: normalizeTransformScale(transform.scale),
    sourceTransform: transform,
  }
}
