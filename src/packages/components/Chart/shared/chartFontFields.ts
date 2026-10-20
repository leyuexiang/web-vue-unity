import type { ChartOptionRecord, ChartPanelSchema, PanelChartOption } from './chartConfigTypes'

type FontPath = Array<string | number>
export interface ChartFontField {
  key: string
  label: string
  path: FontPath
  value?: string
}

const record = (value: unknown): ChartOptionRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ChartOptionRecord)
    : {}

/** 只读取字体对应的样式路径，不遍历业务数据，字段数量只随图表样式复杂度增长。 */
const readPath = (option: unknown, path: FontPath): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      value !== null && typeof value === 'object'
        ? (value as Record<string | number, unknown>)[key]
        : undefined,
    option,
  )

/**
 * 枚举原生图表文字区域；标题、多轴和多系列保留各自路径，不能仅编辑第一个系列。
 * 缺省字体不写入配置，继续由图表主题继承；富文本段独立列出，避免局部字体覆盖父级后看似无效。
 */
export const collectChartFontFields = (
  option: PanelChartOption,
  schema: ChartPanelSchema,
): ChartFontField[] => {
  const fields: ChartFontField[] = []
  const add = (path: FontPath, label: string) => {
    const style = record(readPath(option, path))
    fields.push({
      key: JSON.stringify(path),
      path,
      label,
      value: typeof style.fontFamily === 'string' ? style.fontFamily : undefined,
    })
    Object.entries(record(style.rich)).forEach(([key, value]) => {
      const richPath = [...path, 'rich', key]
      fields.push({
        key: JSON.stringify(richPath),
        path: richPath,
        label: `${label} · ${key}`,
        value:
          typeof record(value).fontFamily === 'string'
            ? (record(value).fontFamily as string)
            : undefined,
      })
    })
  }
  const sections = (
    key: string,
    enabled: boolean,
    visit: (path: FontPath, label: string) => void,
    label: string,
  ) => {
    const value = option[key]
    if (!enabled && value == null) return
    if (Array.isArray(value))
      value.forEach((_, index) => visit([key, index], `${label}${index + 1}`))
    else visit([key], label)
  }
  sections(
    'title',
    schema.supports.title,
    (path, label) => {
      add([...path, 'textStyle'], `${label}字体`)
      add([...path, 'subtextStyle'], `${label}副标题字体`)
    },
    '标题',
  )
  sections(
    'legend',
    schema.supports.legend,
    (path, label) => add([...path, 'textStyle'], `${label}字体`),
    '图例',
  )
  sections('tooltip', true, (path) => add([...path, 'textStyle'], '提示框字体'), '提示框')
  for (const key of ['xAxis', 'yAxis'] as const) {
    sections(
      key,
      schema.supports[key],
      (path, label) => {
        add([...path, 'nameTextStyle'], `${label}名称字体`)
        add([...path, 'axisLabel'], `${label}标签字体`)
      },
      key === 'xAxis' ? '横轴' : '纵轴',
    )
  }
  sections(
    'radar',
    schema.supports.radar,
    (path, label) => add([...path, 'axisName'], `${label}标签字体`),
    '雷达',
  )
  sections(
    'visualMap',
    false,
    (path, label) => add([...path, 'textStyle'], `${label}字体`),
    '视觉映射',
  )
  const series = Array.isArray(option.series) ? option.series : []
  series.forEach((item, index) => {
    const path: FontPath = ['series', index]
    const label = `系列${index + 1}${item.name ? ` · ${item.name}` : ''}`
    if (item.type === 'gauge') {
      add([...path, 'title'], `${label}名称字体`)
      add([...path, 'detail'], `${label}数值字体`)
      add([...path, 'axisLabel'], `${label}刻度字体`)
    } else add([...path, 'label'], `${label}标签字体`)
    if (item.type === 'treemap') {
      add([...path, 'upperLabel'], `${label}上层标签字体`)
      add([...path, 'breadcrumb', 'itemStyle'], `${label}导航字体`)
    }
    if (item.type === 'sankey' && item.edgeLabel)
      add([...path, 'edgeLabel'], `${label}连线标签字体`)
    // 层级样式和强调态只枚举已有覆盖项，避免给没有相关内容的图表增加虚假配置。
    for (const state of ['emphasis', 'select', 'blur']) {
      for (const key of ['label', 'upperLabel']) {
        if (record(item[state])[key])
          add(
            [...path, state, key],
            `${label}${state === 'emphasis' ? '强调' : state === 'select' ? '选中' : '弱化'}标签字体`,
          )
      }
    }
    if (Array.isArray(item.levels))
      item.levels.forEach((level, levelIndex) => {
        for (const key of ['label', 'upperLabel']) {
          if (record(level)[key])
            add(
              [...path, 'levels', levelIndex, key],
              `${label}层级${levelIndex + 1}${key === 'upperLabel' ? '上层' : ''}标签字体`,
            )
        }
      })
  })
  return fields
}

/**
 * 仅浅复制修改路径，保留其余样式和数据引用，避免每次下拉选择复制整个数据集。
 * 直接保存原生 fontFamily 字段，编辑画布、发布预览和数据刷新均复用现有渲染链路。
 */
export const updateChartFontField = (
  option: PanelChartOption,
  path: FontPath,
  fontFamily: string,
): PanelChartOption => {
  const next = { ...option }
  let source: unknown = option
  let target: Record<string | number, unknown> = next
  for (const key of path) {
    source = readPath(source, [key])
    const child = Array.isArray(source) ? [...source] : { ...record(source) }
    target[key] = child
    target = child as Record<string | number, unknown>
  }
  target.fontFamily = fontFamily
  return next
}
