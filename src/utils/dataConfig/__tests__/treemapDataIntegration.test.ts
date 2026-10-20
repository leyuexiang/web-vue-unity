import { describe, expect, it } from 'vitest'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { createEmptyDataConfig, type ChartBindingRule } from '@/types/data-config'
import {
  inferChartDataConfigFromComponent,
  migrateLegacyTreemapStaticDataConfig,
  normalizeStaticChartEditorPayload,
} from '../index'
import { prepareRightDataPanelPersistConfig } from
  '@/views/sceneEdit/SceneRightPanel/components/RightDataPanel/rightDataPanelStateHelpers'

const createTreemapComponent = (
  dataConfig?: ReturnType<typeof createEmptyDataConfig>,
): BaseWidgetConfig =>
  ({
    attr: { l: 0, t: 0, w: 700, h: 110, zIndex: 0 },
    info: { name: '基础矩形树图', keyName: 'VBasicTreemap', packageName: 'Chart', icon: '' },
    option: {
      label: '基础矩形树图',
      chartOption: {
        series: [
          {
            type: 'treemap',
            data: [
              { name: '当归', value: 580 },
              { name: '党参', value: 320 },
            ],
          },
        ],
      },
    },
    styles: { animations: [] },
    dataConfig,
    statusList: [],
    interactiveEvent: [],
  }) as unknown as BaseWidgetConfig

describe('基础矩形树图数据协议', () => {
  it('首次打开数据面板时来源字段与静态内容统一使用 name/value', () => {
    const inferred = inferChartDataConfigFromComponent(createTreemapComponent())
    const binding = inferred?.bindings[0] as ChartBindingRule

    expect(inferred?.dataset.dimensions).toEqual(['name', 'value'])
    expect(inferred?.dataset.source).toEqual([
      { name: '当归', value: 580 },
      { name: '党参', value: 320 },
    ])
    expect(binding.dimensionField).toBe('name')
    expect(binding.measureFields).toEqual(['value'])
    expect(binding.targetDimensionField).toBe('name')
    expect(binding.targetMeasureFields).toEqual(['value'])
  })

  it('编辑静态内容后重建 name/value 来源规则并统一为单数值', () => {
    const legacyConfig = createEmptyDataConfig()
    legacyConfig.bindings = [
      {
        kind: 'chart',
        targetDimensionField: 'name',
        targetMeasureFields: ['value'],
        targetMeasureFieldOrigins: ['inferred'],
        dimensionField: 'product',
        measureFields: ['data1'],
        seriesMode: 'single',
        chartDataShape: 'name-value',
        useDataset: true,
      },
    ]

    const normalized = normalizeStaticChartEditorPayload(
      createTreemapComponent(legacyConfig),
      [{ name: '丹参', value: 64 }],
      legacyConfig,
    )

    expect(normalized.dimensions).toEqual(['name', 'value'])
    expect(normalized.source).toEqual([{ name: '丹参', value: 64 }])
    expect(normalized.binding?.dimensionField).toBe('name')
    expect(normalized.binding?.measureFields).toEqual(['value'])
  })

  it('自动迁移旧版错误生成的 product/data1 静态配置', () => {
    const legacyConfig = createEmptyDataConfig()
    legacyConfig.dataset.dimensions = ['product', 'data1']
    legacyConfig.dataset.source = [{ product: '党参', data1: 320 }]
    legacyConfig.request.config = { data: [{ product: '党参', data1: 320 }] }
    legacyConfig.bindings = [
      {
        kind: 'chart',
        targetDimensionField: 'name',
        targetMeasureFields: ['value'],
        targetMeasureFieldOrigins: ['inferred'],
        dimensionField: 'product',
        measureFields: ['data1'],
        seriesMode: 'single',
        chartDataShape: 'name-value',
        useDataset: true,
      },
    ]

    const migrated = migrateLegacyTreemapStaticDataConfig(
      createTreemapComponent(legacyConfig),
      legacyConfig,
    )
    const binding = migrated?.bindings[0] as ChartBindingRule

    expect(migrated?.dataset.dimensions).toEqual(['name', 'value'])
    expect(migrated?.dataset.source).toEqual([{ name: '党参', value: 320 }])
    expect((migrated?.request.config as { data: unknown }).data).toEqual([
      { name: '党参', value: 320 },
    ])
    expect(binding.dimensionField).toBe('name')
    expect(binding.measureFields).toEqual(['value'])
  })

  it('保存编辑后的静态数据时同步修正字段映射并保持图表可渲染结构', () => {
    const config = createEmptyDataConfig()
    config.dataset.dimensions = ['product', 'data1']
    config.dataset.source = [{ product: '当归', data1: 580 }]
    config.bindings = [
      {
        kind: 'chart',
        targetDimensionField: 'name',
        targetMeasureFields: ['value'],
        targetMeasureFieldOrigins: ['inferred'],
        dimensionField: 'product',
        measureFields: ['data1'],
        seriesMode: 'single',
        chartDataShape: 'name-value',
        useDataset: true,
      },
    ]

    const result = prepareRightDataPanelPersistConfig({
      config,
      staticJsonText: JSON.stringify([{ name: '丹参', value: 64 }]),
      isMarkingSelection: false,
      availableDatasetFields: [],
      isChartWidgetSelection: true,
      selectedChartComponent: createTreemapComponent(config),
    })
    const binding = result.preparedConfig.bindings[0] as ChartBindingRule

    expect(result.staticJsonError).toBe('')
    expect(result.preparedConfig.dataset.dimensions).toEqual(['name', 'value'])
    expect(result.preparedConfig.dataset.source).toEqual([{ name: '丹参', value: 64 }])
    expect(binding.dimensionField).toBe('name')
    expect(binding.measureFields).toEqual(['value'])
    expect(binding.targetDimensionField).toBe('name')
    expect(binding.targetMeasureFields).toEqual(['value'])
  })
})
