import type { VegetationGeoPolygon } from './types'

/**
 * 动态植被地块的固定边长（米）。
 *
 * 该值同时约束浏览器编辑预览与后端按需生成的平面网格；变更它等同于更换地块编号体系，因此只能伴随
 * 动态地块协议版本升级，不能作为运行时可调参数。
 */
export const VEGETATION_DYNAMIC_TILE_EDGE_M = 100

/** 动态窗口沿东西、南北方向各保留一层相邻地块，固定形成三乘三九宫格。 */
export const VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS = 1

/** 动态窗口的固定地块数；前后端均以该值校验请求完整性，避免误将不完整窗口写入缓存。 */
export const VEGETATION_DYNAMIC_TILE_WINDOW_TILE_COUNT =
  (VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS * 2 + 1) ** 2

/**
 * 动态地块协议版本。
 *
 * 它与场景规则版本、高程数据版本共同组成后端缓存维度。网格算法、边长、编号格式或边界解释发生变化时
 * 必须递增该值，防止历史缓存被新客户端错误复用。
 */
export const VEGETATION_DYNAMIC_TILE_PROTOCOL_VERSION = 1

/** 采用 WGS84 长半轴近似值，将固定米制边长映射为稳定的地理网格。 */
const WGS84_SEMI_MAJOR_AXIS_M = 6_378_137
const DEGREES_PER_RADIAN = 180 / Math.PI
const RADIANS_PER_DEGREE = Math.PI / 180
/**
 * 接近两极时经度会收敛，固定到 89.9 度可保证每一行仍有可计算的有限列数。
 *
 * 当前业务区域位于中国境内，不会触发该保护；保留该边界是为了让协议在异常坐标输入下仍返回明确、
 * 可复现的结果，而不是产生无穷大的列号或退化多边形。
 */
const MAXIMUM_ABSOLUTE_LATITUDE_DEGREES = 89.9
const DYNAMIC_TILE_LATITUDE_STEP_RADIANS = VEGETATION_DYNAMIC_TILE_EDGE_M / WGS84_SEMI_MAJOR_AXIS_M
const MINIMUM_DYNAMIC_TILE_LATITUDE_ROW = Math.floor(
  (-MAXIMUM_ABSOLUTE_LATITUDE_DEGREES * RADIANS_PER_DEGREE + Math.PI / 2) /
    DYNAMIC_TILE_LATITUDE_STEP_RADIANS,
)
const MAXIMUM_DYNAMIC_TILE_LATITUDE_ROW = Math.floor(
  (MAXIMUM_ABSOLUTE_LATITUDE_DEGREES * RADIANS_PER_DEGREE + Math.PI / 2) /
    DYNAMIC_TILE_LATITUDE_STEP_RADIANS,
)

/** 动态地块的稳定行列身份；行号和列号可直接用于后端索引、日志与缓存目录。 */
export interface VegetationDynamicTileIdentity {
  /** 协议与行列拼接后的稳定编号，不依赖引擎对象、浏览器浮点格式或当前相机姿态。 */
  readonly id: string
  /** 从南向北递增的全球纬度行编号。 */
  readonly latitudeRow: number
  /** 当前纬度行内从西向东递增、并在日期变更线处循环的经度列编号。 */
  readonly longitudeColumn: number
  /** 当前纬度行的列总数；高纬度经度间距变小时该值会增大。 */
  readonly longitudeColumnCount: number
}

/** 单块动态植被请求所需的纯数据边界；边界使用经度、纬度顺序且首尾闭合。 */
export interface VegetationDynamicTile extends VegetationDynamicTileIdentity {
  readonly polygon: VegetationGeoPolygon
}

interface DynamicTileRadians extends VegetationDynamicTileIdentity {
  readonly south: number
  readonly north: number
  readonly west: number
  readonly east: number
}

/** 将任意经度规范化到半开区间 [-180, 180)，保证日期变更线只有一个稳定列身份。 */
function normalizeLongitudeDegrees(longitudeDegrees: number): number {
  return ((((longitudeDegrees + 180) % 360) + 360) % 360) - 180
}

/** 将纬度收敛到可计算的协议边界，避免接近两极时出现退化地块。 */
function clampLatitudeDegrees(latitudeDegrees: number): number {
  return Math.min(
    MAXIMUM_ABSOLUTE_LATITUDE_DEGREES,
    Math.max(-MAXIMUM_ABSOLUTE_LATITUDE_DEGREES, latitudeDegrees),
  )
}

/** 当前纬度行的经度列数确保每块的东西向宽度不超过固定边长。 */
function getLongitudeColumnCount(latitudeRadians: number): number {
  const targetLongitudeStep =
    VEGETATION_DYNAMIC_TILE_EDGE_M /
    (WGS84_SEMI_MAJOR_AXIS_M * Math.max(0.001, Math.cos(latitudeRadians)))
  return Math.max(1, Math.ceil((Math.PI * 2) / targetLongitudeStep))
}

/** 使用协议版本、行号和列号构造不可歧义的地块编号。 */
function createTileId(latitudeRow: number, longitudeColumn: number): string {
  return `vegetation-dynamic-v${VEGETATION_DYNAMIC_TILE_PROTOCOL_VERSION}:${latitudeRow}:${longitudeColumn}`
}

/**
 * 解析指定地理坐标所属的固定网格身份。
 *
 * 经纬度只在该纯函数中转换一次。调用方拿到的编号可直接参与预览分组和后端缓存键，不应再基于显示用
 * 多边形反向推导行列，避免浮点尾差导致相邻边界出现重复生成。
 */
export function resolveVegetationDynamicTileIdentity(
  longitudeDegrees: number,
  latitudeDegrees: number,
): VegetationDynamicTileIdentity | null {
  if (!Number.isFinite(longitudeDegrees) || !Number.isFinite(latitudeDegrees)) return null

  const latitudeRadians = clampLatitudeDegrees(latitudeDegrees) * RADIANS_PER_DEGREE
  const latitudeRow = Math.floor(
    (latitudeRadians + Math.PI / 2) / DYNAMIC_TILE_LATITUDE_STEP_RADIANS,
  )
  const south = -Math.PI / 2 + latitudeRow * DYNAMIC_TILE_LATITUDE_STEP_RADIANS
  const north = Math.min(Math.PI / 2, south + DYNAMIC_TILE_LATITUDE_STEP_RADIANS)
  const longitudeColumnCount = getLongitudeColumnCount((south + north) / 2)
  const longitudeStepRadians = (Math.PI * 2) / longitudeColumnCount
  const normalizedLongitudeRadians =
    normalizeLongitudeDegrees(longitudeDegrees) * RADIANS_PER_DEGREE
  const longitudeColumn = Math.min(
    longitudeColumnCount - 1,
    Math.floor((normalizedLongitudeRadians + Math.PI) / longitudeStepRadians),
  )
  return {
    id: createTileId(latitudeRow, longitudeColumn),
    latitudeRow,
    longitudeColumn,
    longitudeColumnCount,
  }
}

/**
 * 将稳定行列身份还原为闭合地理矩形。
 *
 * 列号按对应纬度行的列数循环，因此越过日期变更线时不会创建超出合法经度范围的重复地块。该函数只在
 * 九宫格最多九个单元的低频相机停止事件中调用，时间复杂度为 O(1)。
 */
function createVegetationDynamicTile(
  latitudeRow: number,
  longitudeColumn: number,
): DynamicTileRadians {
  const south = -Math.PI / 2 + latitudeRow * DYNAMIC_TILE_LATITUDE_STEP_RADIANS
  const north = Math.min(Math.PI / 2, south + DYNAMIC_TILE_LATITUDE_STEP_RADIANS)
  const longitudeColumnCount = getLongitudeColumnCount((south + north) / 2)
  const normalizedColumn =
    ((longitudeColumn % longitudeColumnCount) + longitudeColumnCount) % longitudeColumnCount
  const longitudeStepRadians = (Math.PI * 2) / longitudeColumnCount
  const west = -Math.PI + normalizedColumn * longitudeStepRadians
  const east = west + longitudeStepRadians
  return {
    id: createTileId(latitudeRow, normalizedColumn),
    latitudeRow,
    longitudeColumn: normalizedColumn,
    longitudeColumnCount,
    south,
    north,
    west,
    east,
  }
}

/** 将内部弧度边界转换为不携带引擎状态的世界大地坐标系闭合多边形。 */
function createTilePolygon(tile: DynamicTileRadians): VegetationGeoPolygon {
  const west = tile.west * DEGREES_PER_RADIAN
  const south = tile.south * DEGREES_PER_RADIAN
  const east = tile.east * DEGREES_PER_RADIAN
  const north = tile.north * DEGREES_PER_RADIAN
  return {
    rings: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  }
}

/**
 * 以相机地理中心生成固定三乘三动态植被窗口。
 *
 * 返回顺序先中心、后近邻，距离相同则按稳定地块编号排序。窗口完全由中心位置决定，刻意忽略当前视锥
 * 的宽高和朝向，避免用户缩放或旋转镜头时意外产生不同的正式地块请求。
 */
export function createVegetationDynamicTileWindow(
  longitudeDegrees: number,
  latitudeDegrees: number,
): readonly VegetationDynamicTile[] {
  const center = resolveVegetationDynamicTileIdentity(longitudeDegrees, latitudeDegrees)
  if (!center) return []

  const candidates: Array<{
    readonly distanceSquared: number
    readonly tile: DynamicTileRadians
  }> = []
  const seenIds = new Set<string>()
  for (
    let rowOffset = -VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS;
    rowOffset <= VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS;
    rowOffset += 1
  ) {
    const latitudeRow = center.latitudeRow + rowOffset
    /** 两极保护带外不创建退化地块；中国业务区域始终获得完整九块窗口。 */
    if (
      latitudeRow < MINIMUM_DYNAMIC_TILE_LATITUDE_ROW ||
      latitudeRow > MAXIMUM_DYNAMIC_TILE_LATITUDE_ROW
    ) {
      continue
    }
    const rowCenterLatitudeRadians =
      -Math.PI / 2 + (latitudeRow + 0.5) * DYNAMIC_TILE_LATITUDE_STEP_RADIANS
    /**
     * 每一纬度行的列数不同，先按当前中心经度重新求列号再取相邻列，避免跨纬度行时列号漂移导致窗口
     * 出现楔形空洞。该规则必须与后端生成器保持一致。
     */
    const rowCenter = resolveVegetationDynamicTileIdentity(
      longitudeDegrees,
      rowCenterLatitudeRadians * DEGREES_PER_RADIAN,
    )
    if (!rowCenter) continue
    for (
      let columnOffset = -VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS;
      columnOffset <= VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS;
      columnOffset += 1
    ) {
      const tile = createVegetationDynamicTile(
        latitudeRow,
        rowCenter.longitudeColumn + columnOffset,
      )
      if (seenIds.has(tile.id)) continue
      seenIds.add(tile.id)
      candidates.push({
        distanceSquared: rowOffset * rowOffset + columnOffset * columnOffset,
        tile,
      })
    }
  }

  return candidates
    .sort(
      (left, right) =>
        left.distanceSquared - right.distanceSquared || left.tile.id.localeCompare(right.tile.id),
    )
    .map(({ tile }) => ({
      id: tile.id,
      latitudeRow: tile.latitudeRow,
      longitudeColumn: tile.longitudeColumn,
      longitudeColumnCount: tile.longitudeColumnCount,
      polygon: createTilePolygon(tile),
    }))
}
