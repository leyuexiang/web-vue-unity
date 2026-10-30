import { describe, expect, it, vi } from 'vitest'
import type { SceneStore, SceneStoreEvent } from '@/scene-platform'
import { bindEditorSceneSelectionToLegacyState } from '../editorSceneSelectionAdapter'

describe('三维对象选中态兼容同步', () => {
  it('画布选择和空白清选会同步检查器编号，并在选择模型时清空二维选择', () => {
    let selectedObjectId: string | null = null
    let listener: ((event: SceneStoreEvent) => void) | null = null
    const store = {
      getSelectedObjectId: () => selectedObjectId,
      subscribe: (nextListener: (event: SceneStoreEvent) => void) => {
        listener = nextListener
        return () => { listener = null }
      },
    } as unknown as Pick<SceneStore, 'getSelectedObjectId' | 'subscribe'>
    const selectedObjectMirror = { value: null as string | null }
    const clearWidgetSelection = vi.fn()

    const unbind = bindEditorSceneSelectionToLegacyState(store, {
      getLegacySelectedObjectId: () => selectedObjectMirror.value,
      setLegacySelectedObjectId: (objectId) => { selectedObjectMirror.value = objectId },
      clearWidgetSelectionWhenObjectSelected: clearWidgetSelection,
    })

    selectedObjectId = 'model-1'
    listener?.({ type: 'selectionChanged', objectId: selectedObjectId })
    expect(selectedObjectMirror.value).toBe('model-1')
    expect(clearWidgetSelection).toHaveBeenCalledTimes(1)

    selectedObjectId = null
    listener?.({ type: 'selectionChanged', objectId: null })
    expect(selectedObjectMirror.value).toBeNull()
    expect(clearWidgetSelection).toHaveBeenCalledTimes(1)

    unbind()
    expect(listener).toBeNull()
  })
})
