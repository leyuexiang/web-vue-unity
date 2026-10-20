import { beforeEach, describe, expect, it, vi } from 'vitest'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { ComponentDataConfig, ComponentDataRequestItem } from '@/types/data-config'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import QuizConfig from '@/packages/components/Widget/Quiz/config'
import { validateQuizPayload } from '@/packages/components/Widget/Quiz/quizUtils'
import { createDefaultPageFrameOption } from '@/packages/components/Widget/VPageMenu/pageFrameTypes'
import { WidgetDataRuntimeService } from '../widgetDataRuntimeService'

const widgetStoreMock = vi.hoisted(() => ({
  totalWidgets: [] as WidgetConfig[],
  bumpWidgetRenderVersion: vi.fn(),
}))

vi.mock('@/stores/sceneEditStore', () => ({
  useSceneWidgetStore: () => widgetStoreMock,
  useSceneDataStore: () => ({ sceneDataset: [] }),
  useSceneRequestStore: () => ({
    scenePublicRequestList: [],
    sceneRequestGlobalConfig: null,
  }),
}))

const createRequest = (id: string, value: string): ComponentDataRequestItem => ({
  id,
  name: id === 'request-1' ? '请求1' : '请求2',
  request: { type: 'ajax', config: {} as ComponentDataRequestItem['request']['config'] },
  dataset: { dimensions: ['value'], source: [{ value }] },
  bindings: [
    {
      kind: 'widget',
      targetPath: 'value',
      sourceField: 'value',
      valueType: 'string',
    },
  ],
})

const createWidget = (): WidgetConfig => {
  const first = createRequest('request-1', 'A')
  const second = createRequest('request-2', 'B')
  const dataConfig: ComponentDataConfig = {
    version: 2,
    requests: [first, second],
    request: first.request,
    dataset: first.dataset,
    bindings: first.bindings,
  }
  return {
    id: 'widget-1',
    component: {
      attr: { l: 0, t: 0, w: 100, h: 40, zIndex: 0 },
      info: { name: '测试控件', keyName: 'VInput', packageName: 'Widget', icon: '' },
      option: { value: '初始值' },
      dataConfig,
      styles: { animations: [] },
      statusList: [],
      interactiveEvent: [],
    } as unknown as BaseWidgetConfig,
  }
}

describe('二维部件多请求运行时隔离', () => {
  beforeEach(() => {
    widgetStoreMock.totalWidgets = []
    widgetStoreMock.bumpWidgetRenderVersion.mockClear()
  })

  it('请求2远程结果只更新请求2，保留请求1和完整请求列表', () => {
    const widget = createWidget()
    widgetStoreMock.totalWidgets = [widget]
    const service = new WidgetDataRuntimeService({
      getDatasets: () => [],
      getPublicRequests: () => [],
      getRequestGlobalConfig: () => ({
        requestOriginUrl: '',
        requestInterval: null,
        requestIntervalUnit: 'second',
        requestParams: { Header: {} },
      }),
    })

    service.applyRemoteExecutionResult({
      kind: 'widget',
      target: widget,
      dataConfig: widget.component.dataConfig as ComponentDataConfig,
      requestId: 'request-2',
      dimensions: ['value'],
      source: [{ value: 'B2' }],
    })

    const requests = widget.component.dataConfig?.requests || []
    expect(requests).toHaveLength(2)
    expect(requests[0].dataset.source).toEqual([{ value: 'A' }])
    expect(requests[1].dataset.source).toEqual([{ value: 'B2' }])
    expect(widget.component.dataConfig?.dataset.source).toEqual([{ value: 'A' }])
  })

  it('测验即使配置多个远程请求也只收集首个完整题库请求', () => {
    const widget = createWidget()
    widget.component.info.keyName = 'VQuiz'
    widgetStoreMock.totalWidgets = [widget]
    const service = new WidgetDataRuntimeService({
      getDatasets: () => [],
      getPublicRequests: () => [],
      getRequestGlobalConfig: () => ({
        requestOriginUrl: '',
        requestInterval: 10,
        requestIntervalUnit: 'second',
        requestParams: { Header: {} },
      }),
    })

    const entries = service.collectRemoteEntries()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ target: widget, requestId: 'request-1' })
  })

  it('预览启动时将数据面板默认静态示例应用到未配置数据源的测验', () => {
    // 场景预览会先应用静态数据；新测验虽能在数据面板推导示例，但初始配置没有已保存的数据源。
    const component = new QuizConfig()
    const widget = {
      id: 'quiz-default-preview',
      component: component as unknown as BaseWidgetConfig,
    } as WidgetConfig
    widgetStoreMock.totalWidgets = [widget]
    const service = new WidgetDataRuntimeService({
      getDatasets: () => [],
      getPublicRequests: () => [],
      getRequestGlobalConfig: () => ({
        requestOriginUrl: '',
        requestInterval: null,
        requestIntervalUnit: 'second',
        requestParams: { Header: {} },
      }),
    })

    service.applyStaticDataConfigs()

    // 首次静态预览复用已确认的接口示例，独立默认标题不混入接口标题字段。
    expect(component.option.quizId).toBe('science-showroom-qa')
    expect(component.option.title).toBe('')
    expect(component.option.questions).toHaveLength(1)
    expect(component.dataConfig?.request.type).toBe('static')
    expect(validateQuizPayload(component.option).valid).toBe(true)
  })

  it('页面框架天气远程结果会回填条件和动态图标', () => {
    const request: ComponentDataRequestItem = {
      id: 'weather-request',
      name: '天气接口',
      request: { type: 'ajax', config: {} as ComponentDataRequestItem['request']['config'] },
      dataset: { dimensions: ['condition', 'icon'], source: [] },
      bindings: [
        { kind: 'widget', targetPath: 'weather.condition', sourceField: 'condition' },
        { kind: 'widget', targetPath: 'weather.icon', sourceField: 'icon' },
      ],
    }
    const dataConfig: ComponentDataConfig = {
      version: 2,
      requests: [request],
      request: request.request,
      dataset: request.dataset,
      bindings: request.bindings,
    }
    const widget = {
      id: 'weather-widget',
      component: {
        attr: { l: 0, t: 0, w: 1920, h: 80, zIndex: 0 },
        info: { name: '页面框架', keyName: 'VPageMenu', packageName: 'Widget', icon: '' },
        option: createDefaultPageFrameOption(),
        dataConfig,
        styles: { animations: [] },
        statusList: [],
        interactiveEvent: [],
      },
    } as unknown as WidgetConfig
    widgetStoreMock.totalWidgets = [widget]
    const service = new WidgetDataRuntimeService({
      getDatasets: () => [],
      getPublicRequests: () => [],
      getRequestGlobalConfig: () => ({
        requestOriginUrl: '',
        requestInterval: null,
        requestIntervalUnit: 'second',
        requestParams: { Header: {} },
      }),
    })

    service.applyRemoteExecutionResult({
      kind: 'widget',
      target: widget,
      dataConfig,
      requestId: request.id,
      dimensions: ['condition', 'icon'],
      source: [{ condition: '小雨', icon: 'wi:day-rain' }],
    })

    expect(widget.component.option.weather.condition).toBe('小雨')
    expect(widget.component.option.weather.iconName).toBe('wi:day-rain')
    expect(widget.component.option.weather.iconUrl).toBe('')
  })
})
