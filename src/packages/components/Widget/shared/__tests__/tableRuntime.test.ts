import { describe, expect, it } from 'vitest'
import type { TablePlusOption } from '../tableTypes'
import {
  buildTableWidgetRuntimeOption,
  inferTableDataConfigFromOption,
  isTableWidgetKeyName,
  resolveTableCellLink,
} from '../tableRuntime'

const createTableOption = (): TablePlusOption => ({
  variant: 'pagination',
  dataset: {
    dimensions: [
      { title: '序号', key: 'sequence', width: 60 },
      { title: '状态', key: 'status', width: 120 },
    ],
    source: Array.from({ length: 10 }, (_, index) => ({
      key: index,
      sequence: index + 1,
      status: '处理中',
    })),
  },
  align: 'center',
  rowHeight: 32,
  colWidth: 90,
  maxNum: 5,
  swiper: false,
  waitTime: 2,
  carousel: 'single',
  style: {
    colHeaders: true,
    bordered: true,
    hLine: true,
    vLine: true,
    stripe: true,
    stripeColor: '#407FFF1F',
    background: '#10131A',
    headerBackground: '#303746',
    textColor: '#E3E8F4',
    headerTextColor: '#FFFFFF',
    borderColor: '#407FFF66',
    fontSize: 14,
  },
  pagination: {
    page: 1,
    pageSize: 5,
    pageSizeOptions: [5, 10, 20],
    maxPageBtn: 5,
    total: 10,
  },
  label: '分页表格',
})

describe('迁移表格数据运行时', () => {
  it.each(['VTableZebra', 'VTableScroll', 'VTablePagination'])('%s 被识别为表格部件', (keyName) => {
    expect(isTableWidgetKeyName(keyName)).toBe(true)
  })

  it('动态对象数组更新后保留列标题和固定列宽', () => {
    const result = buildTableWidgetRuntimeOption(
      'VTableScroll',
      createTableOption() as unknown as Record<string, unknown>,
      [
        { sequence: 11, status: '已完成' },
        { sequence: 12, status: '待处理' },
      ],
      ['sequence', 'status'],
    ) as unknown as TablePlusOption

    expect(result.dataset.dimensions).toEqual([
      { title: '序号', key: 'sequence', width: 60 },
      { title: '状态', key: 'status', width: 120 },
    ])
    expect(result.dataset.source).toEqual([
      { key: 0, sequence: 11, status: '已完成' },
      { key: 1, sequence: 12, status: '待处理' },
    ])
  })

  it('分页默认总数随整表数据数量更新', () => {
    const result = buildTableWidgetRuntimeOption(
      'VTablePagination',
      createTableOption() as unknown as Record<string, unknown>,
      [{ sequence: 1, status: '已完成' }],
      ['sequence', 'status'],
    ) as unknown as TablePlusOption

    expect(result.pagination?.total).toBe(1)
  })

  it('分页显式服务端总数不被当前页数据数量覆盖', () => {
    const option = createTableOption()
    if (option.pagination) option.pagination.total = 100

    const result = buildTableWidgetRuntimeOption(
      'VTablePagination',
      option as unknown as Record<string, unknown>,
      [{ sequence: 1, status: '已完成' }],
      ['sequence', 'status'],
    ) as unknown as TablePlusOption

    expect(result.pagination?.total).toBe(100)
  })

  it('从组件默认值反推整表静态数据配置且不共享引用', () => {
    const option = createTableOption()
    const result = inferTableDataConfigFromOption(
      'VTablePagination',
      option as unknown as Record<string, unknown>,
    )

    expect(result?.dataset.dimensions).toEqual(['sequence', 'status'])
    expect(result?.dataset.source).toEqual(option.dataset.source)
    expect(result?.dataset.source).not.toBe(option.dataset.source)
  })

  it('分页操作列用图纸 ID 生成新窗口链接', () => {
    expect(
      resolveTableCellLink(
        {
          title: '操作',
          key: 'action',
          link: {
            baseUrl: 'https://view.zy.com/2d',
            valueKey: 'drawingId',
            queryParam: 'id',
            text: '点击查看',
            target: '_blank',
          },
        },
        { key: 1, drawingId: 'drawing id/1', action: '点击查看' },
      ),
    ).toBe('https://view.zy.com/2d?id=drawing+id%2F1')
  })

  it('按映射追加多个参数并保留基础地址的已有参数', () => {
    expect(
      resolveTableCellLink(
        {
          title: '操作',
          key: 'action',
          link: {
            baseUrl: 'https://view.zy.com/2d?from=table',
            params: [
              { name: 'id', valueKey: 'drawingId' },
              { name: 'mode', valueKey: 'mode' },
              { name: '', valueKey: 'ignored' },
            ],
          },
        },
        {
          key: 1,
          drawingId: 'drawing id/1',
          mode: '只读&预览',
          ignored: 'value',
          action: '点击查看',
        },
      ),
    ).toBe(
      'https://view.zy.com/2d?from=table&id=drawing+id%2F1&mode=%E5%8F%AA%E8%AF%BB%26%E9%A2%84%E8%A7%88',
    )
  })

  it('优先使用当前行地址字段并允许不追加参数', () => {
    const column = {
      title: '操作',
      key: 'action',
      link: {
        baseUrl: 'https://view.zy.com/2d',
        urlKey: 'detailUrl',
        params: [],
      },
    }

    expect(
      resolveTableCellLink(column, {
        key: 1,
        detailUrl: 'https://example.com/project/one',
        action: '点击查看',
      }),
    ).toBe('https://example.com/project/one')
    expect(
      resolveTableCellLink(
        column,
        { key: 2, detailUrl: '/project/two', action: '点击查看' },
        'https://example.com/editor/',
      ),
    ).toBe('https://example.com/project/two')
  })

  it('行地址为空时回退到固定基础地址', () => {
    expect(
      resolveTableCellLink(
        {
          title: '操作',
          key: 'action',
          link: {
            baseUrl: 'https://view.zy.com/2d',
            urlKey: 'detailUrl',
            params: [{ name: 'id', valueKey: 'drawingId' }],
          },
        },
        { key: 1, detailUrl: '', drawingId: 'drawing-1', action: '点击查看' },
      ),
    ).toBe('https://view.zy.com/2d?id=drawing-1')
  })

  it('拒绝非 HTTP(S) 的操作列链接', () => {
    expect(
      resolveTableCellLink(
        {
          title: '操作',
          key: 'action',
          link: { baseUrl: 'javascript:alert(1)' },
        },
        { key: 1, action: '点击查看' },
      ),
    ).toBe('')

    expect(
      resolveTableCellLink(
        {
          title: '操作',
          key: 'action',
          link: {
            baseUrl: 'https://view.zy.com/2d',
            urlKey: 'detailUrl',
            params: [],
          },
        },
        { key: 1, detailUrl: 'javascript:alert(1)', action: '点击查看' },
      ),
    ).toBe('')
  })
})
