import { afterEach, describe, expect, it, vi } from 'vitest'
import InputConfig from '@/packages/components/Control/VInput/config'
import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import { ACTION_TYPE_ENUM } from '@/enums/scenePanelEnum'
import type { ActionItem } from '@/types/sceneInteraction'
import { createEmptyDataConfig } from '@/types/data-config'
import { executeInteractionActionList } from '@/utils/renderScene/interactionActionExecutors'
import { registerSceneRequestParameterHandler } from '../sceneDataRequestActions'

const disposers: Array<() => void> = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

/** 真实输入框、仓库及动作执行器连通，只替换请求出口，复现面板推导字段但未保存配置的场景。 */
const fixture = (explicitSource = true) => {
  const store = useSceneWidgetStore()
  const input = new InputConfig()
  input.option.value = '默认旧值'
  store.totalWidgets = [{ id: 'input-source', component: input }]
  const handler = vi.fn(async () => undefined)
  disposers.push(registerSceneRequestParameterHandler(handler))
  const action: ActionItem = {
    id: 'button-action',
    actionType: ACTION_TYPE_ENUM.PassParameters,
    ...(explicitSource ? { parameterSource: { kind: 'widget' as const, id: 'input-source' } } : {}),
    parameterTargetKind: 'widget',
    actionTargetWidgetIds: ['image-target'],
    widgetParameterMappings: [
      {
        sourceRequestId: 'request-1',
        sourceField: 'value',
        targetProperty: '["request-1","Params",["id"]]',
      },
    ],
  }
  const execute = () =>
    executeInteractionActionList([action], {
      sceneApi: undefined,
      sourceWidget: input,
      sourceWidgetId: 'input-source',
    })
  return { store, input, handler, action, execute }
}

describe('输入框作为传参来源', () => {
  it.each([true, false])(
    '没有显式数据配置也读取当前输入，不要求先保存数据面板：指定来源=%s',
    (explicit) => {
      const f = fixture(explicit)
      f.store.setWidgetRuntimeValue('input-source', 'value', '12002')
      f.execute()
      expect(f.handler).toHaveBeenCalledWith({
        targetKind: 'widget',
        targetId: 'image-target',
        assignments: [{ targetProperty: '["request-1","Params",["id"]]', value: '12002' }],
      })
      expect(f.input.dataConfig).toBeUndefined()
      expect(f.input.option.value).toBe('默认旧值')
    },
  )

  it.each([0, false, ''])('实时值为%s仍可传参，不能回退默认值', (value) => {
    const f = fixture()
    f.store.setWidgetRuntimeValue('input-source', 'value', value)
    f.execute()
    expect(f.handler).toHaveBeenCalledWith(
      expect.objectContaining({ assignments: [expect.objectContaining({ value })] }),
    )
  })

  it('已有数据配置仍优先读取当前输入；请求被删除后不允许运行时值绕过归属校验', () => {
    const f = fixture()
    f.input.dataConfig = createEmptyDataConfig([{ raw: '接口旧值' }])
    f.input.dataConfig.bindings = [
      { kind: 'widget', targetPath: 'value', sourceField: 'raw', valueType: 'string' },
    ]
    f.store.setWidgetRuntimeValue('input-source', 'value', '新输入')
    f.execute()
    expect(f.handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ assignments: [expect.objectContaining({ value: '新输入' })] }),
    )
    f.action.widgetParameterMappings![0].sourceRequestId = 'deleted-request'
    f.execute()
    expect(f.handler).toHaveBeenCalledTimes(1)
  })
})
