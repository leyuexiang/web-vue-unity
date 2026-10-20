import type { CameraPath } from '../core/types'
import type { SceneCommand } from './types'

/** 相机路径整组更新命令，拖拽结束时提交一次，避免每帧污染撤销历史。 */
export function createUpdateCameraPathsCommand(cameraPaths: readonly CameraPath[]): SceneCommand {
  let previous: CameraPath[] | null = null
  /** 先展开只读输入再快照，命令内部需要持有可独立撤销、重做的可变数据副本。 */
  const next: CameraPath[] = structuredClone([...cameraPaths])
  return {
    name: 'UpdateCameraPaths',
    execute: (store) => {
      if (!previous) previous = structuredClone(store.getCameraPaths() as CameraPath[])
      store.updateCameraPaths(structuredClone(next))
    },
    undo: (store) => {
      if (previous) store.updateCameraPaths(structuredClone(previous))
    },
  }
}
