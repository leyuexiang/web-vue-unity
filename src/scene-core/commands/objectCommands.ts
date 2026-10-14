import type { SceneObject, SceneTransform } from '@/scene-core/model/types'
import type { SceneCommand } from './types'

const clone = <T>(value: T): T => structuredClone(value)

export const createObjectCommand = (object: SceneObject): SceneCommand => ({
  name: '创建对象',
  execute: (store) => store.upsertObject(clone(object)),
  undo: (store) => store.removeObject(object.instanceId),
})

export const deleteObjectCommand = (object: SceneObject): SceneCommand => ({
  name: '删除对象',
  execute: (store) => store.removeObject(object.instanceId),
  undo: (store) => store.upsertObject(clone(object)),
})

export const updateObjectTransformCommand = (
  instanceId: string,
  before: SceneTransform,
  after: SceneTransform,
): SceneCommand => {
  let currentAfter = clone(after)
  return {
    name: '修改对象变换',
    execute(store) {
      const object = store.getObject(instanceId)
      if (object) store.upsertObject({ ...object, transform: clone(currentAfter) })
    },
    undo(store) {
      const object = store.getObject(instanceId)
      if (object) store.upsertObject({ ...object, transform: clone(before) })
    },
    mergeWith(next) {
      const candidate = next as SceneCommand & {
        __transform?: { instanceId: string; after: SceneTransform }
      }
      if (candidate.__transform?.instanceId !== instanceId) return false
      currentAfter = clone(candidate.__transform.after)
      return true
    },
    __transform: { instanceId, after: clone(after) },
  } as SceneCommand
}
