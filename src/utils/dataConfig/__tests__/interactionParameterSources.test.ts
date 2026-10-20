import { describe, expect, it } from 'vitest'
import { createEmptyDataConfig, createDataConfigRequestItem } from '@/types/data-config'
import {
  buildParameterSourceOptions,
  createParameterSourceReader,
  setParameterSourceValue,
} from '../interactionParameterSources'
import type { WidgetParameterMapping } from '@/types/sceneInteraction'

/** 模拟两个请求映射同名业务字段，验证选项与执行读取都按请求隔离。 */
const createConfig = () => {
  const config = createEmptyDataConfig([{ raw: 10, unmapped: 99 }])
  config.bindings = [
    { kind: 'widget', sourceField: 'raw', targetPath: 'value', valueType: 'number' },
  ]
  config.requests!.push(
    createDataConfigRequestItem({
      id: 'second',
      name: '请求2',
      dataset: { dimensions: ['raw'], source: [{ raw: 20 }] },
      bindings: [{ kind: 'marking', sourceField: 'raw', targetPath: 'value', valueType: 'number' }],
    }),
  )
  return config
}

describe('传参来源选择', () => {
  /** 手动字段先命名、后绑定来源；这两种录入阶段都必须出现在传参候选中。 */
  it('显示尚未绑定来源的手动字段，忽略空名称占位', () => {
    const config = createConfig()
    config.bindings.push(
      {
        kind: 'object-custom',
        id: 'custom',
        targetPath: '设备编号',
        sourceField: '',
        valueType: 'string',
      },
      { kind: 'widget', id: 'empty', targetPath: '', sourceField: '', valueType: 'string' },
      {
        kind: 'chart',
        dimensionField: '',
        targetDimensionField: '月份',
        measureFields: [''],
        targetMeasureFields: ['手动指标', '额外指标'],
        targetMeasureFieldOrigins: ['manual', 'manual'],
        seriesMode: 'multi',
        chartDataShape: 'category-value',
      },
    )
    expect(buildParameterSourceOptions(config).map((item) => item.label)).toEqual([
      '请求1 · value',
      '请求1 · 设备编号',
      '请求1 · 月份',
      '请求1 · 手动指标',
      '请求1 · 额外指标',
      '请求2 · value',
    ])
  })
  it('汇总全部请求的映射字段，不混入未映射响应字段', () => {
    const options = buildParameterSourceOptions(createConfig())
    expect(options.map((item) => item.label)).toEqual(['请求1 · value', '请求2 · value'])
    expect(new Set(options.map((item) => item.value)).size).toBe(2)
  })

  it('选择请求2同名字段后读取请求2映射值，序列化后仍保持来源', () => {
    const config = createConfig()
    const mapping: WidgetParameterMapping = { sourceField: '', targetProperty: 'userData.value' }
    setParameterSourceValue(mapping, buildParameterSourceOptions(config)[1].value)
    const saved = JSON.parse(JSON.stringify(mapping))
    expect(createParameterSourceReader(config)(saved)).toBe(20)
    config.requests!.reverse()
    expect(createParameterSourceReader(config)(saved)).toBe(20)
    config.requests = config.requests!.filter((request) => request.id !== 'second')
    expect(createParameterSourceReader(config)(saved)).toBeUndefined()
  })

  it('无响应时仍能选择已配置字段，空配置与旧字段安全读取', () => {
    const config = createConfig()
    config.requests![1].dataset.source = []
    expect(buildParameterSourceOptions(config)).toHaveLength(2)
    expect(
      createParameterSourceReader(null)({ sourceField: 'value', targetProperty: 'value' }),
    ).toBeUndefined()
    expect(
      createParameterSourceReader(config)({ sourceField: 'raw', targetProperty: 'value' }),
    ).toBe(10)
  })
})
