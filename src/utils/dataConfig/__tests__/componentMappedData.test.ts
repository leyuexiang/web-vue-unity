import { describe, expect, it } from 'vitest'
import {
  buildComponentMappedDataFieldOptions,
  resolveComponentMappedDataRow,
} from '../componentMappedData'
import {
  createEmptyDataConfig,
  type ChartBindingRule,
  type CustomObjectBindingRule,
  type ObjectBindingRule,
} from '@/types/data-config'

/**
 * 构造包含人工映射项的图表数据配置，复现“data3 映射到接口 data1”场景。
 * 目标字段与来源字段分开保存，确保测试不会错误依赖二者同名的偶然情况。
 */
const createManualMappingConfig = () => {
  const config = createEmptyDataConfig()
  config.dataset.dimensions = ['product', 'data1', 'data2']
  config.dataset.source = [{ product: '6月', data1: 36, data2: 30 }]
  config.bindings = [
    {
      kind: 'chart',
      targetDimensionField: 'product',
      targetMeasureFields: ['data1', 'data2', 'data3'],
      targetMeasureFieldOrigins: ['inferred', 'inferred', 'manual'],
      dimensionField: 'product',
      measureFields: ['data1', 'data2', 'data1'],
      seriesMode: 'multi',
      chartDataShape: 'category-value',
      useDataset: true,
    } satisfies ChartBindingRule,
  ]
  return config
}

describe('组件映射数据', () => {
  it('规则候选字段包含人工新增的组件目标字段', () => {
    expect(buildComponentMappedDataFieldOptions(createManualMappingConfig())).toEqual([
      'product',
      'data1',
      'data2',
      'data3',
    ])
  })

  it('人工目标字段读取其绑定的接口来源字段值', () => {
    expect(resolveComponentMappedDataRow(createManualMappingConfig())).toEqual({
      product: '6月',
      data1: 36,
      data2: 30,
      data3: 36,
    })
  })

  it('规则候选字段包含已完成的三维内置和自定义映射，忽略空白占位行', () => {
    const config = createEmptyDataConfig()
    config.dataset.dimensions = ['statusCode']
    config.dataset.source = [{ statusCode: 1, customValue: '在线' }]
    config.bindings = [
      {
        kind: 'object',
        targetPath: 'visible',
        sourceField: 'statusCode',
        valueType: 'boolean',
      } satisfies ObjectBindingRule,
      {
        kind: 'object-custom',
        id: 'custom-binding-1',
        targetPath: 'deviceState',
        sourceField: 'customValue',
        valueType: 'string',
      } satisfies CustomObjectBindingRule,
      {
        kind: 'object-custom',
        id: 'custom-binding-empty',
        targetPath: 'pendingField',
        sourceField: '',
        valueType: 'string',
      } satisfies CustomObjectBindingRule,
    ]

    expect(buildComponentMappedDataFieldOptions(config)).toEqual([
      'statusCode',
      'visible',
      'deviceState',
    ])
  })

  it('三维映射目标字段在规则运行时快照中读取来源字段值', () => {
    const config = createEmptyDataConfig()
    config.dataset.source = [{ statusCode: 1, stateText: '在线', device: { name: '设备一' } }]
    config.bindings = [
      {
        kind: 'object',
        targetPath: 'visible',
        sourceField: 'statusCode',
        valueType: 'boolean',
      },
      {
        kind: 'object-custom',
        id: 'custom-binding-2',
        targetPath: 'device.state',
        sourceField: 'stateText',
        valueType: 'string',
      },
    ]

    expect(resolveComponentMappedDataRow(config)).toEqual({
      statusCode: 1,
      stateText: '在线',
      visible: 1,
      device: { name: '设备一', state: '在线' },
    })
    expect(config.dataset.source[0]).toEqual({
      statusCode: 1,
      stateText: '在线',
      device: { name: '设备一' },
    })
  })
})
