import { cloneDeep } from 'lodash-es'
import type {
  TableBasicColumn,
  TableBasicOption,
  TableBasicRow,
  TableCellValue,
  TableListDataItem,
  TableListOption,
  TablePlusColumn,
  TablePlusOption,
  TableScrollBoardOption,
} from './tableTypes'
import { DATA_CONFIG_VERSION, type ComponentDataConfig } from '@/types/data-config'

export const TABLE_WIDGET_KEY_NAMES = [
  'VTableList',
  'VTableScrollBoard',
  'VTablesBasic',
  'VTableZebra',
  'VTableScroll',
  'VTablePagination',
] as const

export type TableWidgetKeyName = (typeof TABLE_WIDGET_KEY_NAMES)[number]

const TABLE_WIDGET_KEY_NAME_SET = new Set<string>(TABLE_WIDGET_KEY_NAMES)

export const isTableWidgetKeyName = (keyName: string | undefined): keyName is TableWidgetKeyName =>
  Boolean(keyName && TABLE_WIDGET_KEY_NAME_SET.has(keyName))

export const toFiniteNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

export const toCellText = (value: unknown) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * 按静态列配置和当前行数据生成安全的单元格链接。
 * urlKey 支持每行提供不同地址，params 支持任意数量的查询参数映射；
 * 未声明 params 的旧场景继续使用 queryParam/valueKey 单参数配置。
 * 仅允许 HTTP(S)，避免导入场景通过 javascript 等协议执行任意脚本。
 */
export const resolveTableCellLink = (
  column: TablePlusColumn,
  row: TableBasicRow,
  currentUrl = 'http://localhost/',
) => {
  const link = column.link
  if (!link) return ''
  const rowUrl = link.urlKey ? toCellText(row[link.urlKey]).trim() : ''
  const configuredUrl = rowUrl || link.baseUrl?.trim()
  if (!configuredUrl) return ''

  try {
    const url = new URL(configuredUrl, currentUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''

    if (link.params) {
      link.params.forEach((parameter) => {
        const name = parameter.name.trim()
        const valueKey = parameter.valueKey.trim()
        const value = valueKey ? row[valueKey] : undefined
        if (!name || !valueKey || value === null || value === undefined || value === '') return
        url.searchParams.set(name, toCellText(value))
      })
    } else {
      const value = row[link.valueKey || column.key]
      if (value === null || value === undefined || value === '') return ''
      url.searchParams.set(link.queryParam || 'id', toCellText(value))
    }

    return url.toString()
  } catch {
    return ''
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const isNumericDimensionList = (dimensions: string[]) =>
  dimensions.length > 0 && dimensions.every((item) => /^\d+$/.test(item))

const getRecordFields = (rows: unknown[], dimensions: string[]) => {
  if (dimensions.length > 0 && !isNumericDimensionList(dimensions)) return dimensions
  const firstRecord = rows.find(isRecord)
  return firstRecord ? Object.keys(firstRecord) : []
}

const createUniqueFieldNames = (header: string[]) => {
  const usedFieldMap = new Map<string, number>()

  return header.map((rawHeader, index) => {
    const fallbackField = `col${index + 1}`
    const baseField = String(rawHeader || fallbackField).trim() || fallbackField
    const usedCount = usedFieldMap.get(baseField) || 0
    usedFieldMap.set(baseField, usedCount + 1)
    return usedCount === 0 ? baseField : `${baseField}_${usedCount + 1}`
  })
}

const getArrayColumnCount = (rows: unknown[]) =>
  rows.reduce<number>((maxCount, row) => {
    if (!Array.isArray(row)) return maxCount
    return Math.max(maxCount, row.length)
  }, 0)

const resolveArrayHeader = (
  rows: unknown[],
  dimensions: string[],
  fallbackHeader: string[] = [],
) => {
  const columnCount = Math.max(getArrayColumnCount(rows), fallbackHeader.length, dimensions.length)
  return Array.from({ length: columnCount }, (_, index) => {
    const dimension = dimensions[index]
    if (dimension && !/^\d+$/.test(dimension)) return dimension
    return fallbackHeader[index] || `列${index + 1}`
  })
}

const pickRecordName = (record: Record<string, unknown>, fields: string[], index: number) => {
  const nameValue = record.name ?? record.label ?? record.title
  if (nameValue !== undefined && nameValue !== null) return toCellText(nameValue)

  const textField = fields.find((field) => {
    const value = record[field]
    return typeof value === 'string' && value.trim()
  })
  return textField ? toCellText(record[textField]) : `第${index + 1}项`
}

const pickRecordNumber = (record: Record<string, unknown>, fields: string[]) => {
  const explicitValue = record.value ?? record.data ?? record.total
  if (explicitValue !== undefined && explicitValue !== null) return toFiniteNumber(explicitValue)

  const numberField = fields.find((field) => Number.isFinite(Number(record[field])))
  return numberField ? toFiniteNumber(record[numberField]) : 0
}

/**
 * 排名列表只需要“名称 + 数值”两列。
 * 动态数据可能来自二维数组、对象数组或字段名不固定的数据源，这里统一收敛成旧列表可消费的结构。
 */
export const normalizeTableListDataset = (
  source: Record<string, unknown>[],
  dimensions: string[] = [],
): TableListDataItem[] => {
  const rows = source as unknown[]
  const recordFields = getRecordFields(rows, dimensions)

  return rows.map((row, index) => {
    if (Array.isArray(row)) {
      return {
        name: toCellText(row[0] ?? `第${index + 1}项`),
        value: toFiniteNumber(row[1] ?? row[0]),
      }
    }

    if (isRecord(row)) {
      return {
        name: pickRecordName(row, recordFields, index),
        value: pickRecordNumber(row, recordFields),
      }
    }

    return {
      name: `第${index + 1}项`,
      value: toFiniteNumber(row),
    }
  })
}

/**
 * 轮播列表以“表头 + 二维行”渲染。
 * 对象数组按字段顺序展开，二维数组保持原有列顺序，避免用户导入旧表格数据后被强制改形。
 */
export const normalizeScrollBoardDataset = (
  source: Record<string, unknown>[],
  dimensions: string[] = [],
  fallbackHeader: string[] = [],
) => {
  const rows = source as unknown[]
  const hasArrayRows = rows.some(Array.isArray)
  const fields = hasArrayRows
    ? resolveArrayHeader(rows, dimensions, fallbackHeader)
    : getRecordFields(rows, dimensions)
  const header = fields.length > 0 ? fields : fallbackHeader

  return {
    header,
    dataset: rows.map<TableCellValue[]>((row) => {
      if (Array.isArray(row)) return row as TableCellValue[]
      if (isRecord(row)) return header.map((field) => row[field] as TableCellValue)
      return [row as TableCellValue]
    }),
  }
}

const createArrayColumns = (
  rows: unknown[],
  dimensions: string[],
  fallbackColumns: TableBasicColumn[],
) => {
  const header = resolveArrayHeader(
    rows,
    dimensions,
    fallbackColumns.map((item) => item.title),
  )
  return header.map<TableBasicColumn>((title, index) => ({
    ...fallbackColumns[index],
    title,
    key: fallbackColumns[index]?.key || `col${index + 1}`,
  }))
}

const createRecordColumns = (
  rows: unknown[],
  dimensions: string[],
  fallbackColumns: TableBasicColumn[],
) => {
  const fields = getRecordFields(rows, dimensions)
  const fallbackMap = new Map(fallbackColumns.map((item) => [item.key, item]))
  return fields.map<TableBasicColumn>((field) => {
    const fallbackColumn = fallbackMap.get(field)
    return {
      ...fallbackColumn,
      key: field,
      title: fallbackColumn?.title || field,
    }
  })
}

/**
 * 基础分页表格需要列定义和对象行。
 * 这里把动态二维数组转成稳定对象行，避免表格内部按数组下标反复做兼容判断。
 */
export const normalizeBasicTableDataset = (
  source: Record<string, unknown>[],
  dimensions: string[] = [],
  fallbackColumns: TableBasicColumn[] = [],
) => {
  const rows = source as unknown[]
  const hasArrayRows = rows.some(Array.isArray)
  const columns = hasArrayRows
    ? createArrayColumns(rows, dimensions, fallbackColumns)
    : createRecordColumns(rows, dimensions, fallbackColumns)

  return {
    dimensions: columns.length > 0 ? columns : fallbackColumns,
    source: rows.map<TableBasicRow>((row, index) => {
      if (Array.isArray(row)) {
        return columns.reduce<TableBasicRow>(
          (result, column, columnIndex) => {
            result[column.key] = row[columnIndex] as TableCellValue
            return result
          },
          { key: index },
        )
      }

      if (isRecord(row)) {
        return {
          key: (row.key as string | number | undefined) ?? index,
          ...(row as Record<string, TableCellValue>),
        }
      }

      return { key: index, value: row as TableCellValue }
    }),
  }
}

/**
 * 表格类部件消费整张数据表，不走普通控件的 value/options 映射。
 * 保留 option 中的样式配置，只替换真正由数据驱动的 dataset/header 部分。
 */
export const buildTableWidgetRuntimeOption = (
  keyName: TableWidgetKeyName,
  baseOption: Record<string, unknown>,
  source: Record<string, unknown>[],
  dimensions: string[],
  bindings: Array<{ targetPath: string; sourceField: string }> = [],
) => {
  const nextOption = cloneDeep(baseOption)
  // 表格映射只重命名明确配置的列，未映射字段继续保留，兼容旧配置。
  const mappedDimensions = bindings.length
    ? bindings.filter((item) => item.targetPath && item.sourceField).map((item) => item.targetPath)
    : dimensions
  const mappedSource = bindings.length
    ? source.map((row) => {
        const result = { ...row }
        bindings.forEach((item) => {
          if (item.targetPath && item.sourceField && item.sourceField in row) {
            result[item.targetPath] = row[item.sourceField]
          }
        })
        return result
      })
    : source

  if (keyName === 'VTableList') {
    ;(nextOption as unknown as TableListOption).dataset = normalizeTableListDataset(
      mappedSource,
      mappedDimensions,
    )
    return nextOption
  }

  if (keyName === 'VTableScrollBoard') {
    const option = nextOption as unknown as TableScrollBoardOption
    const normalized = normalizeScrollBoardDataset(mappedSource, mappedDimensions, option.header)
    option.header = normalized.header
    option.dataset = normalized.dataset
    return nextOption
  }

  if (keyName === 'VTableZebra' || keyName === 'VTableScroll' || keyName === 'VTablePagination') {
    const option = nextOption as unknown as TablePlusOption
    const previousSourceLength = Array.isArray(option.dataset?.source)
      ? option.dataset.source.length
      : undefined
    const normalized = normalizeBasicTableDataset(
      mappedSource,
      mappedDimensions,
      option.dataset?.dimensions || [],
    )
    option.dataset = normalized
    const configuredTotal = toFiniteNumber(option.pagination?.total, 0)
    /** 默认总数随本地数据变化；大于旧数据长度的值视为服务端分页总数并保留。 */
    const shouldSyncTotal =
      option.pagination &&
      (option.pagination.total === undefined ||
        configuredTotal <= 0 ||
        configuredTotal === previousSourceLength)
    if (shouldSyncTotal && option.pagination) {
      option.pagination.total = normalized.source.length
    }
    return nextOption
  }

  const option = nextOption as unknown as TableBasicOption
  const normalized = normalizeBasicTableDataset(
    mappedSource,
    mappedDimensions,
    option.dataset?.dimensions || [],
  )
  option.dataset = normalized
  return nextOption
}

const createTableDataConfig = (
  dimensions: string[],
  source: Record<string, unknown>[],
): ComponentDataConfig => ({
  version: DATA_CONFIG_VERSION,
  request: {
    type: 'static',
    config: {
      data: cloneDeep(source),
    },
  },
  extractor: {
    resultPath: '',
  },
  dataset: {
    dimensions: [...dimensions],
    source: cloneDeep(source),
  },
  bindings: [],
})

/**
 * 从表格部件自身 option 反推右侧数据面板默认静态数据。
 *
 * 新拖入的表格还没有 dataConfig，如果不在这里补齐，右侧“数据内容”只能显示空数组。
 * 这里的反推只生成数据协议，不改动组件样式配置，保证和基础柱状图的默认数据展示口径一致。
 */
export const inferTableDataConfigFromOption = (
  keyName: TableWidgetKeyName,
  option: Record<string, unknown>,
): ComponentDataConfig | null => {
  if (keyName === 'VTableList') {
    const tableOption = option as unknown as TableListOption
    const source = (tableOption.dataset || []).map((item) => ({
      name: item.name,
      value: item.value,
    }))
    return createTableDataConfig(['name', 'value'], source)
  }

  if (keyName === 'VTableScrollBoard') {
    const tableOption = option as unknown as TableScrollBoardOption
    const header =
      tableOption.header && tableOption.header.length > 0
        ? tableOption.header
        : resolveArrayHeader(tableOption.dataset || [], [], [])
    const fieldNames = createUniqueFieldNames(header)
    const source = (tableOption.dataset || []).map<Record<string, unknown>>((row) =>
      fieldNames.reduce<Record<string, unknown>>((result, fieldName, index) => {
        result[fieldName] = Array.isArray(row) ? row[index] : ''
        return result
      }, {}),
    )

    return createTableDataConfig(fieldNames, source)
  }

  if (keyName === 'VTableZebra' || keyName === 'VTableScroll' || keyName === 'VTablePagination') {
    const tableOption = option as unknown as TablePlusOption
    const dimensions = (tableOption.dataset?.dimensions || [])
      .map((item) => item.key)
      .filter(Boolean)
    const source = cloneDeep(tableOption.dataset?.source || []) as Record<string, unknown>[]
    return createTableDataConfig(dimensions, source)
  }

  const tableOption = option as unknown as TableBasicOption
  const dimensions = (tableOption.dataset?.dimensions || []).map((item) => item.key).filter(Boolean)
  const source = cloneDeep(tableOption.dataset?.source || []) as Record<string, unknown>[]
  return createTableDataConfig(dimensions, source)
}

export const parseTextList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const parseNumberList = (value: string) =>
  parseTextList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
