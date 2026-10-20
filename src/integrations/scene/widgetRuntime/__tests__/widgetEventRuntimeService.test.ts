import { describe, expect, it, vi } from 'vitest'
import { INTERACTIVE_EVENT_ENUM } from '@/enums/scenePanelEnum'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { ActionItem, InteractionEvent } from '@/types/threeScene'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { EditorSceneInteractionActionRuntimePort } from '../../editorSceneInteractionActionRuntime'
import {
  WidgetEventRuntimeService,
  type WidgetEventRuntimeAdapter,
} from '../widgetEventRuntimeService'
import { createDefaultPageFrameOption } from '@/packages/components/Widget/VPageMenu/pageFrameTypes'

/**
 * Vitest 的 Node 环境没有浏览器存储；完整动作模块初始化会读取鉴权缓存。
 * 在模块导入前注册内存实现，保证测试仍可加载真实的端口装配代码而不依赖浏览器环境。
 */
vi.hoisted(() => {
  const storage = {
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
    get length() {
      return 0
    },
  }
  Object.assign(globalThis, {
    localStorage: storage,
    sessionStorage: storage,
  })
})

/**
 * 服务测试始终注入自己的适配器，不应加载实际 Pinia 仓库及其图标目录。
 * 最小替身隔离测试对象，确保断言只覆盖二维规则与动作端口的路由关系。
 */
vi.mock('@/stores/sceneEditStore', () => ({
  useSceneWidgetStore: vi.fn(),
}))

/**
 * 默认端口的旧执行器会继续拉入完整渲染依赖；本单元测试只验证显式端口覆盖规则。
 * 替身保留同名工厂，避免无关的图标虚拟模块参与加载。
 */
vi.mock('@/integrations/scene/editorSceneInteractionActionRuntime', () => ({
  createLegacySceneInteractionActionRuntimePort: () => ({ executeActionList: vi.fn() }),
}))

const buildAction = (id: string) => ({ id }) as ActionItem

/**
 * 规则树夹具保持与编辑器保存格式一致。
 * 每条规则只配置一个空条件块，测试重点是验证动作端口归属，不把条件表达式解析混入本组断言。
 */
const buildEvent = (id: string, action: ActionItem, eventType = INTERACTIVE_EVENT_ENUM.Click) =>
  ({
    id,
    eventName: id,
    eventType,
    isOpen: true,
    conditionGroupList: [
      {
        conditionBlokList: [
          {
            conditionList: [],
            actionList: [action],
          },
        ],
      },
    ],
  }) as InteractionEvent

const createWidget = (interactiveEvent: InteractionEvent[], statusList: InteractionEvent[]) =>
  ({
    id: 'widget-runtime-1',
    component: {
      interactiveEvent,
      statusList,
    } as BaseWidgetConfig,
  }) as WidgetConfig

const createAdapter = (widget: WidgetConfig): WidgetEventRuntimeAdapter => ({
  getWidgetById: vi.fn((widgetId: string) => (widgetId === widget.id ? widget : null)),
  getWidgets: vi.fn(() => [widget]),
  evaluateConditionBlock: vi.fn(() => true),
  executeActionList: vi.fn(),
})

describe('WidgetEventRuntimeService', () => {
  it('显式动作端口优先于编辑器默认端口，避免发布预览串用编辑场景', () => {
    const action = buildAction('preview-action')
    const widget = createWidget([buildEvent('widget-click', action)], [])
    const adapter = createAdapter(widget)
    const previewActionRuntime: EditorSceneInteractionActionRuntimePort = {
      executeActionList: vi.fn(),
    }
    const service = new WidgetEventRuntimeService(adapter)

    service.handleWidgetInteractiveEvent(
      widget.id,
      INTERACTIVE_EVENT_ENUM.Click,
      previewActionRuntime,
    )

    expect(previewActionRuntime.executeActionList).toHaveBeenCalledWith([action])
    expect(adapter.executeActionList).not.toHaveBeenCalled()
  })

  it('状态规则同样沿用调用方动作端口，不回退到默认编辑器实例', () => {
    const action = buildAction('preview-status-action')
    const widget = createWidget([], [buildEvent('widget-status', action)])
    const adapter = createAdapter(widget)
    const previewActionRuntime: EditorSceneInteractionActionRuntimePort = {
      executeActionList: vi.fn(),
    }
    const service = new WidgetEventRuntimeService(adapter)

    service.executeAllWidgetStatusEvents(previewActionRuntime)

    expect(previewActionRuntime.executeActionList).toHaveBeenCalledWith([action])
    expect(adapter.executeActionList).not.toHaveBeenCalled()
  })

  it('页面框架子项只执行自身事件并继续复用父部件动作上下文', () => {
    const parentAction = buildAction('parent-action')
    const childAction = buildAction('weather-action')
    const option = createDefaultPageFrameOption()
    option.weather.interactiveEvent = [buildEvent('weather-click', childAction)]
    const widget = createWidget([buildEvent('frame-click', parentAction)], [])
    widget.component.info = {
      name: '页面框架',
      keyName: 'VPageMenu',
      packageName: 'Widget',
      icon: '',
    }
    widget.component.option = option
    const adapter = createAdapter(widget)
    const previewActionRuntime: EditorSceneInteractionActionRuntimePort = {
      executeActionList: vi.fn(),
    }
    const service = new WidgetEventRuntimeService(adapter)

    service.handleWidgetInteractiveEvent(
      widget.id,
      INTERACTIVE_EVENT_ENUM.Click,
      previewActionRuntime,
      option.weather.id,
    )

    expect(previewActionRuntime.executeActionList).toHaveBeenCalledWith([childAction])
    expect(previewActionRuntime.executeActionList).not.toHaveBeenCalledWith([parentAction])
  })
})
