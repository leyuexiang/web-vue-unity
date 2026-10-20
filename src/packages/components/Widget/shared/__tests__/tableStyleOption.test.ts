import { describe, expect, it } from 'vitest'
import { applyTableStyleOption, createTableStyleOption } from '../tableStyleOption'

describe('tableStyleOption', () => {
  it('样式快照保留表头配置并剥离真实数据和运行时字段', () => {
    const option = {
      variant: 'pagination',
      dataset: { dimensions: [{ title: '名称', key: 'name' }], source: [{ name: '设备一' }] },
      style: { fontSize: 14 },
      label: '分页表格',
      visible: true,
      dataConfig: { source: 'api' },
    }

    expect(createTableStyleOption(option)).toEqual({
      dataset: { dimensions: [{ title: '名称', key: 'name' }] },
      style: { fontSize: 14 },
    })
  })

  it('应用 JSON 时原位同步基础字段并保护数据源', () => {
    const source = [{ name: '设备一' }]
    const option = {
      dataset: { dimensions: [{ title: '旧名称', key: 'name' }], source },
      align: 'left',
      style: { fontSize: 14, borderColor: '#fff' },
      label: '基础表格',
    }
    const originalReference = option

    applyTableStyleOption(option, {
      dataset: { dimensions: [{ title: '新名称', key: 'name' }] },
      align: 'center',
      style: { fontSize: 18 },
    })

    expect(option).toBe(originalReference)
    expect(option.dataset.source).toBe(source)
    expect(option.dataset.dimensions[0]?.title).toBe('新名称')
    expect(option.align).toBe('center')
    expect(option.style).toEqual({ fontSize: 18 })
    expect(option.label).toBe('基础表格')
  })

  it('数组数据集不会进入样式 JSON，也不会被样式保存覆盖', () => {
    const dataset = [{ name: '项目一', value: 1 }]
    const option = { dataset, rowNum: 5, color: '#fff' }

    expect(createTableStyleOption(option)).toEqual({ rowNum: 5, color: '#fff' })
    applyTableStyleOption(option, { rowNum: 8, color: '#000', dataset: [{ name: '伪造数据' }] })

    expect(option.dataset).toBe(dataset)
    expect(option.rowNum).toBe(8)
    expect(option.color).toBe('#000')
  })
})
