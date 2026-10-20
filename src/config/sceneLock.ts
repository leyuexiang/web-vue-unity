/**
 * 场景编辑锁的构建时开关。
 *
 * 未配置或配置为非 `false` 时默认开启，避免生产环境漏配后意外关闭并发保护。
 * 本地开发环境通过 `.env.development` 设为 `false`，便于测试场景进入和编辑器界面。
 */
export const parseSceneLockEnabled = (value: string | undefined) =>
  value?.trim().toLowerCase() !== 'false'

export const ENABLE_SCENE_LOCK = parseSceneLockEnabled(import.meta.env.VITE_ENABLE_SCENE_LOCK)
