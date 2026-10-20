import type { SceneCommand } from './types'
import type { Vector3Tuple } from '../runtime/runtimeTypes'

/**
 * Three 相机历史快照。
 *
 * 该命令只保存可序列化的数值，不持有 THREE.Vector3 或 OrbitControls 引用；运行时应用函数由
 * Three 适配层注入，因此撤销/重做仍统一由 CommandBus 调度，不再依赖旧 historyModules 命令类。
 */
export interface ThreeCameraSnapshot {
  readonly position: Vector3Tuple
  readonly target: Vector3Tuple
  readonly fov?: number
  readonly near?: number
  readonly far?: number
}

export interface UpdateCameraCommandOptions {
  readonly previous: ThreeCameraSnapshot
  readonly next: ThreeCameraSnapshot
  /** 将快照应用到底层 Three Runtime；命令总线回放时会调用该函数。 */
  readonly apply: (snapshot: ThreeCameraSnapshot) => void
}

/**
 * 创建原生平台相机命令。
 *
 * 相机交互本身已经先修改了画布，所以首次提交使用 CommandBus.recordExecuted；后续 undo/redo
 * 通过 execute/undo 回调恢复快照。快照数组在创建时复制，避免外部 Vector3.toArray() 结果被修改。
 */
export function createUpdateCameraCommand(options: UpdateCameraCommandOptions): SceneCommand {
  const previous = cloneSnapshot(options.previous)
  const next = cloneSnapshot(options.next)

  return {
    name: 'UpdateCamera',
    execute: () => options.apply(next),
    undo: () => options.apply(previous),
    /**
     * OrbitControls 的一次结束事件对应一次用户操作，不能跨操作合并；高频 change 已由调用侧
     * 300 毫秒防抖收敛，因此这里保持每次相机手势都是独立撤销步骤。
     */
  }
}

function cloneSnapshot(snapshot: ThreeCameraSnapshot): ThreeCameraSnapshot {
  return {
    position: [...snapshot.position] as Vector3Tuple,
    target: [...snapshot.target] as Vector3Tuple,
    ...(snapshot.fov === undefined ? {} : { fov: snapshot.fov }),
    ...(snapshot.near === undefined ? {} : { near: snapshot.near }),
    ...(snapshot.far === undefined ? {} : { far: snapshot.far }),
  }
}
