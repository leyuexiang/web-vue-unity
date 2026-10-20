import { describe, expect, it, vi } from 'vitest'
import {
  createEmptyDataConfig,
  getDataConfigRequests,
  type ChartBindingRule,
  type ComponentDataRequestItem,
} from '@/types/data-config'
import {
  appendDataRequestItem,
  composeChartTargetRows,
  getDuplicateTargetFields,
  getOccupiedTargetFieldsBefore,
  getRequestTargetFields,
  normalizeDataRequestItems,
  removeDataRequestItem,
} from '../multiRequestProtocol'
import { executeComponentDataRequest } from '..'

const requestMock = vi.hoisted(() => vi.fn())

vi.mock('@/request', () => ({
  default: requestMock,
}))

// 本文件验证独立场景的数据协议，隔离本地开发环境的嵌入开关，宿主鉴权由专项用例覆盖。
vi.mock('@/auth/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/auth/runtime')>()),
  isEmbeddedMode: () => false,
}))

const request = (
  source: Record<string, unknown>[],
  bindings: ChartBindingRule[] = [],
): ComponentDataRequestItem => ({
  id: `test-${Math.random()}`,
  name: '请求',
  collapsed: false,
  request: { type: 'static', config: { data: source } },
  dataset: { dimensions: source[0] ? Object.keys(source[0]) : [], source },
  bindings,
})

describe('多请求数据配置协议', () => {
  it('新对象默认创建静态请求1并保留示例数据', () => {
    const config = createEmptyDataConfig([{ label: '示例', value: 1 }])
    expect(config.requests).toHaveLength(1)
    expect(config.requests?.[0].name).toBe('请求1')
    expect(config.requests?.[0].request.type).toBe('static')
    expect(config.requests?.[0].dataset.source).toEqual([{ label: '示例', value: 1 }])
  })

  it('请求项最多五个，删除最后一项恢复静态请求1', () => {
    let config = createEmptyDataConfig([{ value: 1 }])
    for (let i = 0; i < 8; i += 1) config = appendDataRequestItem(config)
    expect(config.requests).toHaveLength(5)
    const ids = config.requests?.map((item) => item.id) || []
    config = removeDataRequestItem(config, ids[0], [{ value: 9 }])
    expect(config.requests).toHaveLength(4)
    expect(config.requests?.map((item) => item.name)).toEqual(['请求1', '请求2', '请求3', '请求4'])
    ids.slice(1).forEach((id) => {
      config = removeDataRequestItem(config, id)
    })
    expect(config.requests).toHaveLength(1)
    expect(config.requests?.[0].request.type).toBe('static')
    expect(config.requests?.[0].dataset.source).toEqual([])

    const staticOnly = createEmptyDataConfig([{ label: '原始示例' }])
    const restored = removeDataRequestItem(staticOnly, 'request-1')
    expect(restored.requests?.[0].dataset.source).toEqual([{ label: '原始示例' }])
  })

  it('跨请求返回前序非空目标字段，图表维度和度量均占用', () => {
    const first = request(
      [{ category: 'A', value: 2 }],
      [
        {
          kind: 'chart',
          dimensionField: 'category',
          measureFields: ['value'],
          targetDimensionField: 'product',
          targetMeasureFields: ['data1'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )
    const second = request([{ category: 'B', value: 3 }])
    expect([...getOccupiedTargetFieldsBefore([first, second], 1)]).toEqual(['product', 'data1'])
  })

  it('自动目标超出 data1、data2 后不再进入跨请求合成', () => {
    const thirdRequest = request(
      [{ category: 'C', value: 4 }],
      [
        {
          kind: 'chart',
          dimensionField: 'category',
          measureFields: ['value'],
          targetDimensionField: 'product',
          targetMeasureFields: ['data3'],
          targetMeasureFieldOrigins: ['inferred'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )

    expect(
      composeChartTargetRows([
        { rows: thirdRequest.dataset.source, bindings: thirdRequest.bindings },
      ]),
    ).toEqual([{ product: 'C' }])
    expect(getRequestTargetFields(thirdRequest)).toEqual(new Set(['product']))
  })

  it('人工自定义目标不被自动槽位清理规则误删', () => {
    const manualRequest = request(
      [{ category: 'D', value: 5 }],
      [
        {
          kind: 'chart',
          dimensionField: 'category',
          measureFields: ['value'],
          targetDimensionField: 'product',
          targetMeasureFields: ['customValue'],
          targetMeasureFieldOrigins: ['manual'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )

    expect(
      composeChartTargetRows([
        { rows: manualRequest.dataset.source, bindings: manualRequest.bindings },
      ]),
    ).toEqual([{ product: 'D', customValue: 5 }])
    expect(getRequestTargetFields(manualRequest)).toEqual(new Set(['product', 'customValue']))
  })

  it('空目标字段不占用来源字段，重复目标在保存前可被统一识别', () => {
    const first = request(
      [{ value: 2 }],
      [
        {
          kind: 'chart',
          dimensionField: '',
          measureFields: ['value'],
          targetDimensionField: '',
          targetMeasureFields: [''],
          targetMeasureFieldOrigins: ['manual'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )
    const second = request(
      [{ amount: 3 }],
      [
        {
          kind: 'chart',
          dimensionField: '',
          measureFields: ['amount'],
          targetDimensionField: '',
          targetMeasureFields: ['data2'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )
    const third = request(
      [{ count: 4 }],
      [
        {
          kind: 'chart',
          dimensionField: '',
          measureFields: ['count'],
          targetDimensionField: '',
          targetMeasureFields: ['data2'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )

    expect([...getOccupiedTargetFieldsBefore([first, second], 1)]).toEqual([])
    expect(getDuplicateTargetFields([first, second, third])).toEqual(['data2'])
  })

  it('删除普通组件、图标或打点的来源后会释放原目标字段', () => {
    const releasedRequest = request([{ value: 2 }])
    releasedRequest.bindings = [
      {
        kind: 'widget',
        targetPath: 'value',
        sourceField: '',
        valueType: 'string',
      },
      {
        kind: 'marking',
        targetPath: 'position',
        sourceField: '',
        valueType: 'vector3',
      },
    ]

    // 来源被清空后，目标行可能暂时保留在界面草稿中，但不能再阻塞后续请求。
    expect(getRequestTargetFields(releasedRequest)).toEqual(new Set())
    expect([...getOccupiedTargetFieldsBefore([releasedRequest, request([])], 1)]).toEqual([])
  })

  it('删除图表来源后会释放仍保留在行模型中的目标字段', () => {
    const releasedRequest = request(
      [{ value: 2 }],
      [
        {
          kind: 'chart',
          dimensionField: '',
          measureFields: [''],
          targetDimensionField: 'product',
          targetMeasureFields: ['data1'],
          targetMeasureFieldOrigins: ['inferred'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
        },
      ],
    )

    // 图表整行删除前后都必须以来源是否存在作为占用判断，不能读取悬空目标。
    expect(getRequestTargetFields(releasedRequest)).toEqual(new Set())
  })

  it('人工映射先填写目标时会立即占位，阻止其它请求使用同名目标', () => {
    const first = request([])
    first.bindings = [
      {
        kind: 'object-custom',
        id: 'manual-object-1',
        targetPath: 'status',
        sourceField: '',
        valueType: 'string',
      },
    ]
    const second = request([{ status: '在线' }])
    second.bindings = [
      {
        kind: 'widget',
        targetPath: 'status',
        sourceField: 'status',
        valueType: 'string',
      },
    ]

    // 人工目标是用户明确选择的配置意图，即使来源尚未选择，也不能被后续请求抢占。
    expect([...getOccupiedTargetFieldsBefore([first, second], 1)]).toEqual(['status'])
    expect(getDuplicateTargetFields([first, second])).toEqual(['status'])
  })

  it('图表新增行使用相同目标时会被保存前重复校验识别', () => {
    const chartRequest = request(
      [{ amount: 1 }],
      [
        {
          kind: 'chart',
          dimensionField: '',
          measureFields: ['', ''],
          targetDimensionField: '',
          targetMeasureFields: ['customValue', 'customValue'],
          targetMeasureFieldOrigins: ['manual', 'manual'],
          seriesMode: 'multi',
          chartDataShape: 'category-value',
        },
      ],
    )

    // 人工目标即使来源还未选择也先占位，因此图表新增行的同名目标不能静默保存。
    expect(getDuplicateTargetFields([chartRequest])).toEqual(['customValue'])
  })

  it('多个请求按行号合成图表目标字段，缺失行填空', () => {
    const chartBinding = (
      dimension: string,
      measure: string,
      target: string,
    ): ChartBindingRule => ({
      kind: 'chart',
      dimensionField: dimension,
      measureFields: [measure],
      targetDimensionField: 'product',
      targetMeasureFields: [target],
      seriesMode: 'single',
      chartDataShape: 'category-value',
    })
    const rows = composeChartTargetRows([
      {
        rows: [{ category: 'A' }, { category: 'B' }],
        bindings: [chartBinding('category', 'missing', 'data1')],
      },
      { rows: [{ value: 10 }], bindings: [chartBinding('category', 'value', 'data2')] },
    ])
    expect(rows).toEqual([
      { product: '', data1: '', data2: 10 },
      { product: '', data1: '', data2: '' },
    ])
  })

  it('规范化空配置时保留首项静态示例数据且不超过五项', () => {
    const items = normalizeDataRequestItems(createEmptyDataConfig([{ value: 7 }]))
    expect(items).toHaveLength(1)
    expect(items[0].dataset.source).toEqual([{ value: 7 }])
  })

  it('配置序列化后仍以请求项为准读取首项更新', () => {
    const original = createEmptyDataConfig([{ value: '旧值' }])
    // 后端 JSON 往返会拆开请求项和根级镜像的对象引用，模拟真实加载结果。
    const restored = JSON.parse(JSON.stringify(original)) as typeof original
    restored.requests![0].dataset.source = [{ value: '新值' }]

    expect(getDataConfigRequests(restored)[0].dataset.source).toEqual([{ value: '新值' }])
  })

  it('单请求执行后保留原始数据形态，供过滤器重复编辑时稳定复用', async () => {
    const config = createEmptyDataConfig([
      { name: '保留', enabled: true },
      { name: '移除', enabled: false },
    ])

    const result = await executeComponentDataRequest(config)

    expect(result.source).toEqual([
      { name: '保留', enabled: true },
      { name: '移除', enabled: false },
    ])
    // 单请求不能额外变成 [[...]]，否则后续保存过滤器时 data/res 的结构会与首次执行不同。
    expect(result.raw).toEqual([
      { name: '保留', enabled: true },
      { name: '移除', enabled: false },
    ])
  })

  it('发送动态请求时始终执行当前请求项已经保存的过滤器', async () => {
    requestMock.mockResolvedValueOnce([
      { name: '保留', enabled: true },
      { name: '移除', enabled: false },
    ])
    const config = createEmptyDataConfig()
    const firstRequest = config.requests![0]
    firstRequest.request = {
      type: 'ajax',
      config: {
        requestHttpType: 'GET',
        requestInterval: 0,
        requestIntervalUnit: 'second',
        requestOriginUrl: '',
        requestUrl: '/filter-test',
        requestContentType: 'default',
        requestParamsBodyType: 'none',
        requestParams: {
          Params: {},
          Header: {},
          Body: { json: '', xml: '', 'form-data': {}, 'x-www-form-urlencoded': {} },
        },
        requestSQLContent: { sql: '' },
      },
    }
    firstRequest.filterFn = 'return data.filter((item) => item.enabled)'

    const result = await executeComponentDataRequest(config)

    expect(requestMock).toHaveBeenCalledOnce()
    // 数据面板配置的接口路径必须原样发送，不能被当前宿主平台自动追加 operation。
    expect(requestMock).toHaveBeenCalledWith(
      '/filter-test',
      expect.objectContaining({
        preserveConfiguredHeaders: true,
        skipPlatformPath: true,
      }),
    )
    expect(result.source).toEqual([{ name: '保留', enabled: true }])
    // 原始响应供再次编辑过滤器复用，不能被过滤结果覆盖或增加单请求数组包装层。
    expect(result.raw).toEqual([
      { name: '保留', enabled: true },
      { name: '移除', enabled: false },
    ])
  })
})
