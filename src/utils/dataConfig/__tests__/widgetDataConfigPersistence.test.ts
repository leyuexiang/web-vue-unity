import { beforeEach, describe, expect, it, vi } from 'vitest'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import {
  createEmptyDataConfig,
  createDataConfigRequestItem,
  type WidgetBindingRule,
} from '@/types/data-config'
import { setWidgetDataConfigById, getWidgetDataConfigById } from '../index'
import {
  buildParameterSourceOptions,
  buildWidgetTargetPropertyOptions,
  createParameterSourceReader,
} from '../interactionParameterSources'

/**
 * 使用轻量仓库替身隔离数据配置保存行为，避免把画布、命令历史和浏览器环境带入单元测试。
 * `runWidgetHistoryChange` 仍会执行真实修改回调，以便同时验证 option 同步和渲染版本刷新。
 */
const widgetStoreMock = vi.hoisted(() => ({
  getWidgetById: vi.fn(),
  runWidgetHistoryChange: vi.fn((_name: string, _ids: string[], mutate: () => unknown) => mutate()),
  bumpWidgetRenderVersion: vi.fn(),
}))

vi.mock('@/stores/sceneEditStore', () => ({
  useSceneWidgetStore: () => widgetStoreMock,
  useSceneStore: () => ({}),
  /** 静态数据解析仍会读取场景数据集列表；测试中提供空列表即可保持与无数据集场景一致。 */
  useSceneDataStore: () => ({ sceneDataset: [] }),
  /** 同步解析也会读取公共请求与全局请求配置，静态数据场景无需提供任何请求项。 */
  useSceneRequestStore: () => ({
    scenePublicRequestList: [],
    sceneRequestGlobalConfig: null,
  }),
}))

/** 构造带 value 属性的普通二维组件，覆盖文字、输入框等共用的数据映射路径。 */
const createValueWidget = (keyName: string, oldValue: string, packageName = 'Widget') => ({
  id: `widget-${keyName}`,
  component: {
    attr: { l: 0, t: 0, w: 200, h: 40, zIndex: 0 },
    info: { name: keyName, keyName, packageName, icon: '' },
    option: { value: oldValue },
    styles: { animations: [] },
    statusList: [],
    interactiveEvent: [],
  } as unknown as BaseWidgetConfig,
})

/** 构造与右侧数据面板一致的静态 value 映射配置。 */
const createValueDataConfig = (value: string) => {
  const dataConfig = createEmptyDataConfig()
  const source = [{ value }]

  dataConfig.request.config = { data: source }
  dataConfig.dataset.dimensions = ['value']
  dataConfig.dataset.source = source
  dataConfig.bindings = [
    {
      kind: 'widget',
      targetPath: 'value',
      sourceField: 'value',
      valueType: 'string',
    } satisfies WidgetBindingRule,
  ]

  return dataConfig
}

/** 构造列表属性映射，覆盖下拉框、标签选择器和轮播类组件共用的 options 路径。 */
const createOptionsDataConfig = (options: string[]) => {
  const dataConfig = createEmptyDataConfig()
  const source = [{ options }]

  dataConfig.request.config = { data: source }
  dataConfig.dataset.dimensions = ['options']
  dataConfig.dataset.source = source
  dataConfig.bindings = [
    {
      kind: 'widget',
      targetPath: 'options',
      sourceField: 'options',
      // 绑定值类型目前没有数组枚举；运行时会按目标属性把 JSON 数组规范化为选项列表。
      valueType: 'string',
    } satisfies WidgetBindingRule,
  ]

  return dataConfig
}

describe('二维部件数据配置持久化', () => {
  /** 图片默认映射由数据面板适配器从 option 推导，动作候选也必须包含该字段和手动字段。 */
  it('动作候选同时包含图片自动推导的 value 与手动新增映射字段', () => {
    const imageWidget = createValueWidget('VImage', '/default-image.png')
    widgetStoreMock.getWidgetById.mockReturnValue(imageWidget)

    const inferredConfig = getWidgetDataConfigById(imageWidget.id)
    expect(buildWidgetTargetPropertyOptions(inferredConfig).map(({ value }) => value)).toEqual([
      'value',
    ])

    inferredConfig?.bindings.push({
      kind: 'widget',
      id: 'manual-image-label',
      targetPath: 'imageLabel',
      sourceField: '',
      valueType: 'string',
    })
    setWidgetDataConfigById(imageWidget.id, inferredConfig)

    expect(
      buildWidgetTargetPropertyOptions(getWidgetDataConfigById(imageWidget.id)).map(
        ({ value }) => value,
      ),
    ).toEqual(['value', 'imageLabel'])
  })

  /** 复现截图：先读取默认value，再保存请求3的test2映射，验证完整保存读取链路。 */
  it('旧候选读取后新增第三个请求，保存后能选择并读取test2', () => {
    const widget = createValueWidget('VTextCommon', '旧内容')
    widgetStoreMock.getWidgetById.mockReturnValue(widget)
    getWidgetDataConfigById(widget.id)
    const config = createValueDataConfig('初始值')
    config.requests!.push(createDataConfigRequestItem({ id: 'request-2' }))
    config.requests!.push(
      createDataConfigRequestItem({
        id: 'request-3',
        name: '请求3',
        request: { type: 'static', config: { data: [{ test: 123 }] } },
        dataset: { dimensions: ['test'], source: [{ test: 123 }] },
        bindings: [
          {
            kind: 'widget',
            id: 'manual-test2',
            targetPath: 'test2',
            sourceField: 'test',
            valueType: 'string',
          },
        ],
      }),
    )
    setWidgetDataConfigById(widget.id, config)
    const saved = getWidgetDataConfigById(widget.id)
    expect(buildParameterSourceOptions(saved).map((item) => item.label)).toContain('请求3 · test2')
    expect(
      createParameterSourceReader(saved)({
        sourceRequestId: 'request-3',
        sourceField: 'test2',
        targetProperty: 'value',
      }),
    ).toBe(123)
  })
  beforeEach(() => {
    widgetStoreMock.getWidgetById.mockReset()
    widgetStoreMock.runWidgetHistoryChange.mockClear()
    widgetStoreMock.bumpWidgetRenderVersion.mockClear()
  })

  it.each([
    ['普通文字', 'VTextCommon', 'Widget'],
    ['输入框', 'VInput', 'Control'],
    ['下拉选择器', 'VSelect', 'Control'],
  ])('%s保存静态数据后同步显示值并刷新自身渲染缓存', (_, keyName, packageName) => {
    const widget = createValueWidget(keyName, '旧内容', packageName)
    widgetStoreMock.getWidgetById.mockReturnValue(widget)

    setWidgetDataConfigById(widget.id, createValueDataConfig('新内容'))

    expect((widget.component.option as Record<string, unknown>).value).toBe('新内容')
    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledTimes(1)
    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledWith(widget.id)
  })

  it('图表保存数据配置后继续刷新自身渲染缓存', () => {
    const widget = createValueWidget('VBar', '旧内容', 'Chart')
    widgetStoreMock.getWidgetById.mockReturnValue(widget)

    setWidgetDataConfigById(widget.id, createValueDataConfig('新内容'))

    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledTimes(1)
    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledWith(widget.id)
  })

  it('列表类组件保存选项数据后同步 options 并刷新自身渲染缓存', () => {
    const widget = createValueWidget('VSelect', '旧选项', 'Control')
    widget.component.option = { options: [{ label: '旧选项', value: '旧选项' }] }
    widgetStoreMock.getWidgetById.mockReturnValue(widget)

    setWidgetDataConfigById(widget.id, createOptionsDataConfig(['甲', '乙']))

    expect((widget.component.option as Record<string, unknown>).options).toEqual([
      { label: '甲', value: '甲' },
      { label: '乙', value: '乙' },
    ])
    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledTimes(1)
    expect(widgetStoreMock.bumpWidgetRenderVersion).toHaveBeenCalledWith(widget.id)
  })
})
