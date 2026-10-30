import { describe, expect, it, vi } from 'vitest'
import type { SceneObject, SceneStore, ViewportHost } from '@/scene-platform'
import {
  ACTION_TYPE_ENUM,
  CONDITION_RULE_TYPE_ENUM,
  FIXED_VALUE_TYPE_ENUM,
  INTERACTIVE_EVENT_ENUM,
  JUDGMENT_TYPE_ENUM,
  MODEL_VALUE_TYPE_ENUM,
  OBJECT_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import type { InteractionEvent } from '@/types/threeScene'
import { createEditorSceneObjectBehaviorRuntime } from '../editorSceneObjectBehaviorRuntime'

const createObject = (id: string, metadata: Record<string, unknown> = {}) =>
  ({ id, name: id, type: 'model', visible: true, locked: false, order: 0, transform: { kind: 'local', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, metadata }) as SceneObject

const createFixture = (objects: SceneObject[]) => {
  const objectById = new Map(objects.map((object) => [object.id, object]))
  let listener: ((event: { objectId: string; eventType: 'click' }) => void) | null = null
  const setObjectVisibleAsync = vi.fn().mockResolvedValue(true)
  const runtime = {
    subscribeObjectInteraction: (next: typeof listener) => {
      listener = next
      return () => { listener = null }
    },
    setObjectVisibleAsync,
  }
  const store = {
    getObject: (id: string) => objectById.get(id) ?? null,
    getScene: () => ({ objects: [...objectById.values()] }),
    subscribe: () => () => undefined,
  } as unknown as SceneStore
  const host = {
    getStore: () => store,
    getRuntime: () => runtime,
  } as unknown as ViewportHost
  return { host, listener: () => listener, setObjectVisibleAsync }
}

const createVisibilityAction = (objectId: string, visible: boolean) => ({
  id: 'visibility-action',
  actionType: ACTION_TYPE_ENUM.ModelVisibility,
  actionTargetUuid: objectId,
  modelVisibility: visible,
})

describe('三维对象状态与点击事件运行服务', () => {
  it('编辑点击不触发事件，预览点击按配置执行模型显隐', async () => {
    const event = {
      id: 'click-event',
      eventName: '点击事件',
      eventType: INTERACTIVE_EVENT_ENUM.Click,
      isOpen: true,
      conditionGroupList: [{
        id: 'group-1',
        conditionBlokList: [{
          id: 'block-1',
          conditionList: [],
          conditionRuleType: null,
          actionList: [createVisibilityAction('target', false)],
        }],
      }],
    } as unknown as InteractionEvent
    const fixture = createFixture([
      createObject('source', { interactiveEvent: [event] }),
      createObject('target'),
    ])
    const behavior = createEditorSceneObjectBehaviorRuntime({ getViewportHost: () => fixture.host })

    fixture.listener()?.({ objectId: 'source', eventType: 'click' })
    expect(fixture.setObjectVisibleAsync).not.toHaveBeenCalled()

    behavior.preparePreview()
    await behavior.startPreview()
    fixture.listener()?.({ objectId: 'source', eventType: 'click' })
    await vi.waitFor(() => expect(fixture.setObjectVisibleAsync).toHaveBeenCalledWith('target', false))
    behavior.exitPreview()
    expect(fixture.setObjectVisibleAsync).toHaveBeenLastCalledWith('target', true)
    behavior.dispose()
  })

  it('相同状态持续满足时只执行一次，数据轮询回写不会重复提交显隐动作', async () => {
    const status = {
      id: 'visible-status',
      statusName: '可见状态',
      isOpen: true,
      conditionGroupList: [{
        id: 'group-1',
        conditionBlokList: [{
          id: 'block-1',
          conditionList: [{
            id: 'condition-1',
            status: true,
            sourceObjectType: OBJECT_TYPE_ENUM.ModelValue,
            sourceModelValueType: MODEL_VALUE_TYPE_ENUM.Visibility,
            sourceModelValue: 'source',
            targetObjectType: OBJECT_TYPE_ENUM.FixedValue,
            targetFixedValueType: FIXED_VALUE_TYPE_ENUM.Boolean,
            targetFixedValue: false,
            judgmentType: JUDGMENT_TYPE_ENUM.Equal,
          }],
          conditionRuleType: CONDITION_RULE_TYPE_ENUM.All,
          actionList: [createVisibilityAction('target', false)],
        }],
      }],
    } as unknown as InteractionEvent
    const source = createObject('source', { statusList: [status] })
    const fixture = createFixture([source, createObject('target')])
    const behavior = createEditorSceneObjectBehaviorRuntime({ getViewportHost: () => fixture.host })

    behavior.preparePreview()
    await behavior.startPreview()
    await behavior.observeSceneObject({ ...source, visible: false })
    await behavior.observeSceneObject({ ...source, visible: false, metadata: { ...source.metadata, dataConfig: { requests: [] } } })
    expect(fixture.setObjectVisibleAsync).toHaveBeenCalledTimes(1)
    behavior.dispose()
  })
})
