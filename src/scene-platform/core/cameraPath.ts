/**
 * 相机路径总时长的统一约束。
 *
 * `durationMs` 表示完整播放时长，`waypoint.timeMs` 表示到达路径点的时间；两者之间
 * 预留的尾段用于完成最后一次姿态转向。编辑器、领域校验和 Cesium 播放器都使用同一组范围，
 * 避免某一层接受的数据在另一层又被截断。
 */
export const CAMERA_PATH_DURATION_RANGE = {
  min: 100,
  max: 600000,
  step: 100,
} as const

/** 路径点绝对时间和总时长统一按 100 毫秒对齐。 */
export const CAMERA_PATH_TIME_STEP_MS = CAMERA_PATH_DURATION_RANGE.step

/**
 * 相机路径转向时长的统一约束。
 *
 * 转向配置同时适用于手工关键帧和自动朝向路径：前者控制关键帧姿态过渡窗口，后者控制路径
 * 方向转弯窗口。两种模式都需要在总时长末尾保留这段时间，确保最后一个姿态不会被截断。
 */
export const CAMERA_PATH_TURN_DURATION_RANGE = {
  min: 200,
  max: 5000,
  step: 100,
} as const

/** 新建路径和历史路径缺省的平滑转向时长，单位为毫秒。 */
export const CAMERA_PATH_DEFAULT_TURN_DURATION_MS = 1500

/**
 * 将运行时或兼容层收到的转向时长归一化到统一范围。
 *
 * 持久化校验不会调用此函数吞掉非法输入；它只服务于面板默认值、兼容旧数据和 Runtime 的
 * 防御性读取，保证缺失或异常输入不会产生负时长、NaN 或非步长时间窗口。
 */
export const normalizeCameraPathTurnDurationMs = (value?: number): number => {
  const safeValue =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : CAMERA_PATH_DEFAULT_TURN_DURATION_MS
  const clamped = Math.min(
    CAMERA_PATH_TURN_DURATION_RANGE.max,
    Math.max(CAMERA_PATH_TURN_DURATION_RANGE.min, safeValue),
  )
  return Math.round(clamped / CAMERA_PATH_TURN_DURATION_RANGE.step)
    * CAMERA_PATH_TURN_DURATION_RANGE.step
}

/**
 * 计算一条路径合法的最小完整播放时长。
 *
 * 路径点时间是绝对到达时间，因此最小总时长由最后一个路径点和转向尾段共同决定；点位尚未
 * 创建或时间无效时仍返回一个可供表单使用的安全下限。计算结果按总时长步长对齐，避免面板
 * 和校验因浮点输入产生一毫秒差异。
 */
export const getCameraPathMinimumTotalDurationMs = (
  lastWaypointTimeMs: number,
  turnDurationMs?: number,
): number => {
  const safeLastWaypointTimeMs = Number.isFinite(lastWaypointTimeMs)
    ? Math.max(0, Math.ceil(lastWaypointTimeMs / CAMERA_PATH_TIME_STEP_MS) * CAMERA_PATH_TIME_STEP_MS)
    : 0
  return Math.max(
    CAMERA_PATH_DURATION_RANGE.min,
    safeLastWaypointTimeMs + normalizeCameraPathTurnDurationMs(turnDurationMs),
  )
}

/**
 * 将用户编辑的总时长归一化到范围和指定最小值。
 *
 * 最小值由路径点数量或末点时间计算得到；当输入为空或小于最小值时，优先返回合法下限，
 * 这样调用方可以直接用结果重排路径点，而不必在各处重复处理边界。
 */
export const normalizeCameraPathDurationMs = (
  value: number,
  minimumDurationMs: number,
): number => {
  const safeMinimum = Math.max(
    CAMERA_PATH_DURATION_RANGE.min,
    Math.ceil(minimumDurationMs / CAMERA_PATH_TIME_STEP_MS) * CAMERA_PATH_TIME_STEP_MS,
  )
  const safeValue = Number.isFinite(value) ? Math.round(value) : safeMinimum
  const clamped = Math.min(
    CAMERA_PATH_DURATION_RANGE.max,
    Math.max(safeMinimum, safeValue),
  )
  return Math.round(clamped / CAMERA_PATH_TIME_STEP_MS) * CAMERA_PATH_TIME_STEP_MS
}
