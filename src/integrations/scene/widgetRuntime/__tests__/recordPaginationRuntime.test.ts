import { afterEach, describe, expect, it, vi } from 'vitest'
import Config from '@/packages/components/Control/RecordPagination/config'
import {
  createEmptyDataConfig,
  createEmptyRequestGlobalConfig,
  type AjaxRequestConfig,
  type PublicRequestConfig,
} from '@/types/data-config'
import { buildParameterTargetOptions } from '@/utils/dataConfig/interactionRequestParameters'
import { buildRecordPaginationRequest } from '@/utils/dataConfig/recordPaginationRequest'
import { createParameterSourceReader } from '@/utils/dataConfig/interactionParameterSources'
import { getRecordPaginationSelection } from '@/utils/dataConfig/recordPaginationSelection'
import { validateRecordPaginationPage } from '@/packages/components/Control/RecordPagination/model'
import { RecordPaginationRuntime, recordPaginationContext } from '../recordPaginationRuntime'
import { getWidgetRuntimePort, setWidgetPreviewState, setWidgetRuntimePort } from '../ports'
import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import InputConfig from '@/packages/components/Control/VInput/config'
import { SceneDataPollingRuntime } from '../sceneDataPollingRuntime'
import request from '@/request'
import { executeInteractionActionList } from '@/utils/renderScene/interactionActionExecutors'
import { registerSceneRequestParameterHandler } from '../sceneDataRequestActions'
import { ACTION_TYPE_ENUM } from '@/enums/scenePanelEnum'

// 只替换网络边界；提取、过滤、参数覆盖、当前记录映射和生命周期均执行真实代码。
vi.mock('@/request', () => ({ default: vi.fn() }))
// 当前开发环境开启嵌入鉴权；此处测试普通独立场景，不提供真实宿主凭据。
vi.mock('@/auth/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/auth/runtime')>()),
  isEmbeddedMode: () => false,
}))
const network = vi.mocked(request)
const runtimes: RecordPaginationRuntime[] = []
afterEach(() => {
  runtimes.splice(0).forEach((runtime) => runtime.stop())
  setWidgetPreviewState(false)
  vi.resetAllMocks()
})

const fixture = (firstPage: 0 | 1 = 1, total = 5) => {
  const component = new Config()
  const config = createEmptyDataConfig()
  const ajax = {
    requestUrl: '/list',
    requestHttpType: 'GET',
    requestInterval: 1,
    requestIntervalUnit: 'second',
    requestParams: { Params: { page: '99', size: '99', filter: 'all' }, Header: {}, Body: {} },
  } as AjaxRequestConfig
  config.request = { type: 'ajax', config: ajax }
  config.bindings = [
    {
      kind: 'widget',
      id: 'manual-key',
      targetPath: 'detailId',
      sourceField: 'id',
      valueType: 'number',
    },
  ]
  component.dataConfig = config
  const parameters = buildParameterTargetOptions(config)
  Object.assign(component.option.pagination, {
    firstPage,
    pageSize: 2,
    listPath: 'list',
    totalPath: 'total',
    pageParameter: parameters.find((item) => item.label.endsWith(' · page'))!.value,
    sizeParameter: parameters.find((item) => item.label.endsWith(' · size'))!.value,
  })
  network.mockImplementation(async (_url, options) => {
    const params = options?.params as Record<string, string>
    const start = (Number(params.page) - firstPage) * Number(params.size)
    const list = Array.from({ length: Math.min(2, Math.max(0, total - start)) }, (_, index) => ({
      id: start + index,
    }))
    return { data: { list, total } }
  })
  const values: unknown[] = []
  const runtime = new RecordPaginationRuntime({
    getWidgets: () => [{ id: 'records', component }],
    getPublicRequests: () => [],
    getRequestGlobalConfig: createEmptyRequestGlobalConfig,
    dispatchSelection: () => {
      const reader = createParameterSourceReader(config, getRecordPaginationSelection(component))
      values.push(
        reader({ sourceRequestId: 'request-1', sourceField: 'detailId', targetProperty: 'unused' }),
      )
    },
  })
  runtimes.push(runtime)
  runtime.start()
  const ready = () =>
    vi.waitFor(() => expect(recordPaginationContext.getState('records')?.loading).toBe(false))
  return { component, config, ajax, values, runtime, ready }
}

describe('逐条翻页真实数据管线', () => {
  it('从普通组件或翻页组件向公共接口传参，全部订阅刷新且分页参数仍由实例管理', async () => {
    const f = fixture()
    f.runtime.stop()
    const shared: PublicRequestConfig = { ...f.ajax, id: 'shared', name: '公共列表' }
    f.config.request = { type: 'public', config: { publicRequestId: shared.id } }
    const component = new InputConfig()
    component.dataConfig = createEmptyDataConfig()
    component.dataConfig.request = { type: 'public', config: { publicRequestId: shared.id } }
    component.dataConfig.bindings = [
      { kind: 'widget', targetPath: 'value', sourceField: 'id', valueType: 'string' },
    ]
    const widgets = useSceneWidgetStore()
    widgets.totalWidgets = [
      { id: 'records', component: f.component },
      { id: 'input', component },
    ]
    network.mockImplementation(async (_url, options) => {
      const params = options?.params as Record<string, string>
      return { data: { list: [{ id: params.filter }], total: 1, filter: params.filter } }
    })
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [shared],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
    })
    try {
      setWidgetPreviewState(true)
      await runtime.start()
      await f.ready()
      for (const targetId of ['input', 'records']) {
        network.mockClear()
        await runtime.passParameters({
          targetKind: 'widget',
          targetId,
          assignments: [
            {
              targetProperty: buildParameterTargetOptions(f.config, [shared]).find((item) =>
                item.label.endsWith(' · filter'),
              )!.value,
              value: targetId,
            },
          ],
        })
        expect(component.option.value).toBe(targetId)
        expect(recordPaginationContext.getState('records')).toMatchObject({
          page: 1,
          index: 0,
          rows: [{ id: targetId }],
        })
        // 普通订阅共享一次请求；翻页实例使用自己的页码和条数另发列表请求。
        expect(network).toHaveBeenCalledTimes(2)
        expect(network.mock.calls.map(([, options]) => options?.params)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ filter: targetId, page: '1', size: '2' }),
            expect.objectContaining({ filter: targetId, page: '99', size: '99' }),
          ]),
        )
        await runtime.start()
        expect(network).toHaveBeenCalledTimes(2)
      }
      expect(shared.requestParams.Params).toEqual({ page: '99', size: '99', filter: 'all' })
    } finally {
      runtime.dispose()
    }
  })

  it('传参并跨页后新增远程组件，重建场景调度不得重发默认列表或重置当前记录', async () => {
    const f = fixture()
    f.runtime.stop()
    const widgetStore = useSceneWidgetStore()
    widgetStore.totalWidgets = [{ id: 'records', component: f.component }]
    const originalNetwork = network.getMockImplementation()!
    network.mockImplementation(async (url, options) =>
      url === '/new-component' ? { data: { text: '新组件数据' } } : originalNetwork(url, options),
    )
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
    })
    try {
      setWidgetPreviewState(true)
      await runtime.start()
      await f.ready()
      const filterTarget = buildParameterTargetOptions(f.config).find((item) =>
        item.label.endsWith(' · filter'),
      )!.value
      await runtime.passParameters({
        targetKind: 'widget',
        targetId: 'records',
        assignments: [{ targetProperty: filterTarget, value: '5' }],
      })
      await recordPaginationContext.move('records', 1)
      await recordPaginationContext.move('records', 1)
      const currentState = recordPaginationContext.getState('records')!
      const currentSelection = getRecordPaginationSelection(f.component, 'records')
      const previousRequests = network.mock.calls.filter(([url]) => url === '/list').length
      const component = new InputConfig()
      component.dataConfig = createEmptyDataConfig()
      component.dataConfig.request = {
        type: 'ajax',
        config: { ...f.ajax, requestUrl: '/new-component', requestInterval: 0 },
      }
      component.dataConfig.bindings = [
        { kind: 'widget', targetPath: 'value', sourceField: 'text', valueType: 'string' },
      ]
      widgetStore.totalWidgets = [...widgetStore.totalWidgets!, { id: 'new-component', component }]
      // 发布预览懒加载会调用同一调度器的 start；必须通过真实入口覆盖这条重启链路。
      await runtime.start()
      await f.ready()
      expect(component.option.value).toBe('新组件数据')
      expect(network.mock.calls.filter(([url]) => url === '/list')).toHaveLength(previousRequests)
      expect(recordPaginationContext.getState('records')).toBe(currentState)
      expect(currentState).toMatchObject({ page: 2, index: 0 })
      expect(getRecordPaginationSelection(f.component, 'records')?.row).toEqual(
        currentSelection?.row,
      )
      await recordPaginationContext.move('records', 1)
      await recordPaginationContext.move('records', 1)
      expect(
        network.mock.calls.filter(([url]) => url === '/list').at(-1)?.[1]?.params,
      ).toMatchObject({ filter: '5', page: '3' })
    } finally {
      runtime.dispose()
    }
  })
  // 同一真实事件链同时覆盖查询式详情和路径式详情，验证页内、跨页均使用当前记录编号。
  it.each(['/detail', '/detail/${params.id}'])(
    '场景调度器与已有动作联动：详情地址 %s 初始化及跨页更新，列表不进入轮询',
    async (detailUrl) => {
      const f = fixture()
      f.runtime.stop()
      const detail = new InputConfig()
      const detailData = createEmptyDataConfig()
      detailData.request = {
        type: 'ajax',
        config: {
          ...f.ajax,
          requestUrl: detailUrl,
          requestParams: { ...f.ajax.requestParams, Params: { id: '99' } },
        },
      }
      detailData.bindings = [
        { kind: 'widget', targetPath: 'value', sourceField: 'text', valueType: 'string' },
      ]
      detail.dataConfig = detailData
      const targetProperty = buildParameterTargetOptions(detailData)[0].value
      useSceneWidgetStore().totalWidgets = [
        { id: 'records', component: f.component },
        { id: 'detail', component: detail },
      ]
      const listNetwork = network.getMockImplementation()!
      network.mockImplementation(async (url, options) => {
        if (!String(url).startsWith('/detail')) return listNetwork(url, options)
        // 查询式和路径式接口分别从实际发送位置取编号，不能用配置中的旧默认值伪造详情。
        const id =
          url === '/detail'
            ? (options?.params as Record<string, string>).id
            : String(url).split('/').at(-1)
        return { data: { text: `详情${id}` } }
      })
      const originalPort = getWidgetRuntimePort()
      setWidgetRuntimePort({
        ...originalPort,
        handleInteractiveEvent: (sourceWidgetId) => {
          executeInteractionActionList(
            [
              {
                actionType: ACTION_TYPE_ENUM.PassParameters,
                parameterTargetKind: 'widget',
                actionTargetWidgetIds: ['detail'],
                widgetParameterMappings: [
                  { sourceRequestId: 'request-1', sourceField: 'detailId', targetProperty },
                ],
              },
            ],
            { sceneApi: null, sourceWidget: f.component, sourceWidgetId },
          )
        },
      })
      const runtime = new SceneDataPollingRuntime({
        getPublicRequests: () => [],
        getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      })
      try {
        setWidgetPreviewState(true)
        await runtime.start()
        await vi.waitFor(() => expect(detail.option.value).toBe('详情0'))
        await recordPaginationContext.move('records', 1)
        await vi.waitFor(() => expect(detail.option.value).toBe('详情1'))
        await recordPaginationContext.move('records', 1)
        await vi.waitFor(() => expect(detail.option.value).toBe('详情2'))
        expect(network.mock.calls.filter(([url]) => url === '/list')).toHaveLength(2)
        expect((detailData.request.config as AjaxRequestConfig).requestParams.Params.id).toBe('99')
        if (detailUrl.includes('${')) {
          // 初始化默认请求可能先执行；后三次成功联动必须分别请求当前记录，且不重复附带编号。
          const details = network.mock.calls
            .filter(([url]) => String(url).startsWith('/detail/'))
            .slice(-3)
          expect(details.map(([url]) => url)).toEqual(['/detail/0', '/detail/1', '/detail/2'])
          for (const [, options] of details) expect(options?.params ?? {}).not.toHaveProperty('id')
        }
      } finally {
        runtime.dispose()
        setWidgetRuntimePort(originalPort)
      }
    },
  )
  it('外部筛选通过已有参数协议覆盖，立即返回首条，不修改保存参数', async () => {
    const f = fixture()
    setWidgetPreviewState(true)
    await f.ready()
    await recordPaginationContext.move('records', 1)
    const filterTarget = buildParameterTargetOptions(f.config).find((option) =>
      option.label.endsWith(' · filter'),
    )!.value
    expect(
      await f.runtime.passParameters('records', [
        { targetProperty: filterTarget, value: 'changed' },
      ]),
    ).toBe(true)
    expect(recordPaginationContext.getState('records')).toMatchObject({ page: 1, index: 0 })
    expect(f.values).toEqual([0, 1, 0])
    expect(network.mock.calls.at(-1)?.[1]?.params).toMatchObject({ filter: 'changed', page: '1' })
    expect(f.ajax.requestParams.Params.filter).toBe('all')
  })
  it('已有传参并刷新动作直接读取当前记录字段，普通来源仍读取原首条', async () => {
    const f = fixture()
    const passed = vi.fn(async () => undefined)
    const unregister = registerSceneRequestParameterHandler(passed)
    try {
      setWidgetPreviewState(true)
      await f.ready()
      await recordPaginationContext.move('records', 1)
      executeInteractionActionList(
        [
          {
            actionType: ACTION_TYPE_ENUM.PassParameters,
            parameterTargetKind: 'widget',
            actionTargetWidgetIds: ['detail'],
            widgetParameterMappings: [
              {
                sourceRequestId: 'request-1',
                sourceField: 'detailId',
                targetProperty: '["request-1","Params",["id"]]',
              },
            ],
          },
        ],
        { sceneApi: null, sourceWidget: f.component },
      )
      expect(passed).toHaveBeenCalledWith({
        targetKind: 'widget',
        targetId: 'detail',
        assignments: [{ targetProperty: '["request-1","Params",["id"]]', value: 1 }],
      })
      expect(
        createParameterSourceReader(createEmptyDataConfig([{ id: 999 }]))({
          sourceField: 'id',
          targetProperty: 'unused',
        }),
      ).toBe(999)
    } finally {
      unregister()
    }
  })
  it.each([0, 1] as const)(
    '页码从%s开始：页内不请求，双向跨页与末页精确定位，事件读取当前映射字段及零值',
    async (firstPage) => {
      const f = fixture(firstPage)
      expect(network).not.toHaveBeenCalled()
      setWidgetPreviewState(true)
      await f.ready()
      expect(f.values).toEqual([0])
      await recordPaginationContext.move('records', -1)
      expect(f.values).toEqual([0])
      await recordPaginationContext.move('records', 1)
      expect(f.values).toEqual([0, 1])
      // 样式历史回放可能替换组件配置对象，稳定编号仍指向同一条当前记录。
      const restoredComponent = new Config()
      expect(getRecordPaginationSelection(restoredComponent, 'records')?.row.id).toBe(1)
      expect(network).toHaveBeenCalledTimes(1)
      await recordPaginationContext.move('records', 1)
      expect(f.values).toEqual([0, 1, 2])
      expect(network).toHaveBeenCalledTimes(2)
      await recordPaginationContext.move('records', -1)
      expect(f.values).toEqual([0, 1, 2, 1])
      await recordPaginationContext.move('records', 1)
      await recordPaginationContext.move('records', 1)
      await recordPaginationContext.move('records', 1)
      expect(f.values.at(-1)).toBe(4)
      const count = network.mock.calls.length
      await recordPaginationContext.move('records', 1)
      expect(network).toHaveBeenCalledTimes(count)
      expect(recordPaginationContext.getState('records')?.rows).toEqual([{ id: 4 }])
      expect(f.ajax.requestParams.Params).toEqual({ page: '99', size: '99', filter: 'all' })
      expect(f.config.dataset.source).toEqual([])
    },
  )

  it.each([0, 1])('总数%s时双按钮禁用，空列表不派发详情事件', async (total) => {
    const f = fixture(1, total)
    setWidgetPreviewState(true)
    await f.ready()
    await recordPaginationContext.move('records', -1)
    await recordPaginationContext.move('records', 1)
    expect(network).toHaveBeenCalledTimes(1)
    expect(f.values).toEqual(total ? [0] : [])
  })

  it('跨页失败保留旧位置；锁定期间连续点击不重复请求，重试后只派发一次', async () => {
    const f = fixture()
    setWidgetPreviewState(true)
    await f.ready()
    await recordPaginationContext.move('records', 1)
    let reject!: (error: Error) => void
    network.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        }),
    )
    const moving = recordPaginationContext.move('records', 1)
    await recordPaginationContext.move('records', 1)
    expect(network).toHaveBeenCalledTimes(2)
    reject(new Error('网络失败'))
    await moving
    expect(recordPaginationContext.getState('records')).toMatchObject({
      page: 1,
      index: 1,
      loading: false,
    })
    expect(f.values).toEqual([0, 1])
    await recordPaginationContext.retry('records')
    expect(f.values).toEqual([0, 1, 2])
  })

  it('退出预览丢弃迟到响应，重新进入从首条加载；销毁移除状态和来源投影', async () => {
    const f = fixture()
    let resolve!: (value: unknown) => void
    network.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    setWidgetPreviewState(true)
    setWidgetPreviewState(false)
    resolve({ data: { list: [{ id: 0 }, { id: 1 }], total: 5 } })
    await f.ready()
    expect(f.values).toEqual([])
    expect(getRecordPaginationSelection(f.component)).toBeUndefined()
    setWidgetPreviewState(true)
    await f.ready()
    expect(f.values).toEqual([0])
    f.runtime.stop()
    expect(recordPaginationContext.getState('records')).toBeUndefined()
    expect(getRecordPaginationSelection(f.component)).toBeUndefined()
  })

  it('公共请求分页参数只覆盖实例，结构化请求体保留数值类型', () => {
    const f = fixture()
    const publicRequest = {
      ...f.ajax,
      id: 'shared',
      requestHttpType: 'POST',
      requestParamsBodyType: 'json',
      requestParams: {
        ...f.ajax.requestParams,
        Params: {},
        Body: {
          ...f.ajax.requestParams.Body,
          json: '{"paging":{"page":7,"size":7},"filter":"all"}',
        },
      },
    } as PublicRequestConfig
    f.config.request = { type: 'public', config: { publicRequestId: 'shared' } }
    const temporary = {
      ...f.config,
      requests: [
        { ...f.config.requests![0], request: { type: 'ajax' as const, config: publicRequest } },
      ],
    }
    const options = buildParameterTargetOptions(temporary)
    f.component.option.pagination.pageParameter = options.find((item) =>
      item.label.endsWith('paging.page'),
    )!.value
    f.component.option.pagination.sizeParameter = options.find((item) =>
      item.label.endsWith('paging.size'),
    )!.value
    const result = buildRecordPaginationRequest(
      f.config,
      f.component.option.pagination,
      [publicRequest],
      2,
    )
    expect(
      JSON.parse((result.request.config as AjaxRequestConfig).requestParams.Body.json),
    ).toEqual({ paging: { page: 2, size: 2 }, filter: 'all' })
    expect(JSON.parse(publicRequest.requestParams.Body.json).paging).toEqual({ page: 7, size: 7 })
  })

  it('无效总数、错误列表路径、记录数与总数不一致必须报错', () => {
    const f = fixture()
    const binding = f.component.option.pagination
    expect(() => validateRecordPaginationPage({ list: [], total: null }, [], binding, 1)).toThrow(
      '总条数',
    )
    expect(() => validateRecordPaginationPage({ list: {}, total: 0 }, [], binding, 1)).toThrow(
      '列表路径',
    )
    expect(() => validateRecordPaginationPage({ list: [], total: 5 }, [], binding, 1)).toThrow(
      '记录数量',
    )
  })
})
