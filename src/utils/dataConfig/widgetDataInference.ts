import { cloneDeep } from 'lodash-es'
import {
  DATA_CONFIG_VERSION,
  type ComponentDataConfig,
  type DataBindingValueType,
  type WidgetBindingRule,
} from '@/types/data-config'
import { QUIZ_PREVIEW_PAYLOAD } from '@/packages/components/Widget/Quiz/quizUtils'

type WidgetOptionRecord = Record<string, unknown>
type WidgetDataFieldConfig = {
  optionKey: string
  sourceField: string
}

type PaginationWidgetDataFieldConfig = WidgetDataFieldConfig & {
  targetPath: WidgetBindingRule['targetPath']
}

const LIST_WIDGET_KEY_NAMES = new Set(['VImageCarousel'])
const QUIZ_WIDGET_KEY_NAME = 'VQuiz'
const OPTION_CONTENT_WIDGET_KEY_NAMES = new Set(['VSelect', 'VInputsTab'])

const PAGINATION_WIDGET_KEY_NAMES = new Set(['VInputsPagination'])

/**
 * 分页器是当前唯一同时具有三个独立数值数据属性的普通部件。
 * 字段表集中维护“组件属性、静态数据字段、映射目标”的一一对应关系，避免通用组件误暴露分页属性。
 */
const PAGINATION_WIDGET_DATA_FIELDS: PaginationWidgetDataFieldConfig[] = [
  { optionKey: 'value', sourceField: 'value', targetPath: 'value' },
  { optionKey: 'total', sourceField: 'total', targetPath: 'total' },
  { optionKey: 'pageSize', sourceField: 'pageSize', targetPath: 'pageSize' },
]

/**
 * 这些组件渲染层读取的是 option.dataset，但右侧数据面板的通用语义是 value。
 * 数据配置仍统一生成 value 字段，运行时再镜像到 dataset，避免面板协议分裂。
 */
const DATASET_VALUE_WIDGET_KEY_NAMES = new Set([
  'VNumber',
  'VFlipperNumber',
  'VCountDown',
  'VIcon',
  'VDecorate03',
  'VDecorate06',
])

const isRecord = (value: unknown): value is WidgetOptionRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const isStaticCellValue = (value: unknown) =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'

const inferValueType = (value: unknown): DataBindingValueType => {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}

const createWidgetBinding = (
  targetPath: WidgetBindingRule['targetPath'],
  sourceField: string,
  valueType: DataBindingValueType,
): WidgetBindingRule => ({
  kind: 'widget',
  targetPath,
  sourceField,
  valueType,
})

const collectDimensions = (source: WidgetOptionRecord[]) => {
  const dimensions: string[] = []

  source.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!dimensions.includes(key)) {
        dimensions.push(key)
      }
    })
  })

  return dimensions
}

const createWidgetDataConfig = (
  source: WidgetOptionRecord[],
  bindings: WidgetBindingRule[],
): ComponentDataConfig | null => {
  if (source.length === 0) return null

  const dimensions = collectDimensions(source)
  return {
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
      dimensions,
      source: cloneDeep(source),
    },
    bindings,
  }
}

const createRowsFromOptions = (options: unknown) => {
  if (!Array.isArray(options) || options.length === 0) return []

  return options
    .map<WidgetOptionRecord | null>((item, index) => {
      if (!isRecord(item)) {
        return isStaticCellValue(item)
          ? {
              label: String(item ?? `选项${index + 1}`),
              value: item,
            }
          : null
      }

      const row = Object.entries(item).reduce<WidgetOptionRecord>((result, [key, value]) => {
        if (isStaticCellValue(value)) {
          result[key] = value
        }
        return result
      }, {})

      if (!('label' in row)) {
        row.label = String(row.value ?? row.name ?? `选项${index + 1}`)
      }
      if (!('value' in row)) {
        row.value = row.label
      }

      return row
    })
    .filter((item): item is WidgetOptionRecord => Boolean(item))
}

const createRowsFromFields = (
  option: WidgetOptionRecord,
  fields: WidgetDataFieldConfig[],
) => {
  const row = fields.reduce<WidgetOptionRecord>((result, field) => {
    if (!(field.optionKey in option)) return result

    const value = option[field.optionKey] === undefined ? null : option[field.optionKey]
    if (isStaticCellValue(value)) {
      result[field.sourceField] = value
    }
    return result
  }, {})

  return Object.keys(row).length > 0 ? [row] : []
}

const getFirstSourceValue = (source: WidgetOptionRecord[], sourceField: string) =>
  source.find((row) => sourceField in row)?.[sourceField]

const inferListWidgetDataConfig = (option: WidgetOptionRecord) => {
  const source = createRowsFromOptions(option.options)
  if (source.length === 0) return null

  const dimensions = collectDimensions(source)
  const sourceField = dimensions.includes('value') ? 'value' : dimensions[0]
  if (!sourceField) return createWidgetDataConfig(source, [])

  return createWidgetDataConfig(source, [
    createWidgetBinding('value', sourceField, inferValueType(getFirstSourceValue(source, sourceField))),
    createWidgetBinding('options', sourceField, 'string'),
  ])
}

const inferOptionContentWidgetDataConfig = (option: WidgetOptionRecord) => {
  const value = option.value === undefined ? null : option.value
  const row: WidgetOptionRecord = {
    value,
  }
  const bindings = [
    createWidgetBinding('value', 'value', inferValueType(value)),
  ]

  if (Array.isArray(option.options)) {
    row.options = cloneDeep(option.options)
    bindings.push(createWidgetBinding('options', 'options', 'string'))
  }

  return createWidgetDataConfig([row], bindings)
}

const inferFieldWidgetDataConfig = (
  option: WidgetOptionRecord,
  fields: WidgetDataFieldConfig[],
  valueSourceField = 'value',
) => {
  const source = createRowsFromFields(option, fields)
  if (source.length === 0) return null

  const bindings = valueSourceField in source[0]
    ? [
        createWidgetBinding(
          'value',
          valueSourceField,
          inferValueType(source[0][valueSourceField]),
        ),
      ]
    : []

  return createWidgetDataConfig(source, bindings)
}

/**
 * 从分页器运行属性生成完整的默认静态数据和三条数值映射。
 * 该函数只由 `VInputsPagination` 分支调用，不改变文字、输入框、选择器等组件的单值推导规则。
 */
const inferPaginationWidgetDataConfig = (option: WidgetOptionRecord) => {
  const source = createRowsFromFields(option, PAGINATION_WIDGET_DATA_FIELDS)
  if (source.length === 0) return null

  const firstRow = source[0]
  const bindings = PAGINATION_WIDGET_DATA_FIELDS.filter(
    (field) => field.sourceField in firstRow,
  ).map((field) =>
    createWidgetBinding(
      field.targetPath,
      field.sourceField,
      inferValueType(firstRow[field.sourceField]),
    ),
  )

  return createWidgetDataConfig(source, bindings)
}

/** 测验静态请求保持一行完整题库；题目和选项嵌套对象不能展平为普通 options。 */
const inferQuizWidgetDataConfig = (option: WidgetOptionRecord) => {
  const fields: WidgetDataFieldConfig[] = [
    { optionKey: 'quizId', sourceField: 'quizId' },
    { optionKey: 'title', sourceField: 'title' },
    { optionKey: 'total', sourceField: 'total' },
    { optionKey: 'questions', sourceField: 'questions' },
  ]
  /** 新组件题库为空时给数据面板一份可直接参照的完整静态题库；已有题目始终优先保留。 */
  const sourceOption: WidgetOptionRecord =
    Array.isArray(option.questions) && option.questions.length > 0
      ? option
      : {
          ...QUIZ_PREVIEW_PAYLOAD,
          ...option,
          quizId:
            typeof option.quizId === 'string' && option.quizId.trim()
              ? option.quizId
              : QUIZ_PREVIEW_PAYLOAD.quizId,
          title:
            typeof option.title === 'string' && option.title.trim()
              ? option.title
              : QUIZ_PREVIEW_PAYLOAD.title,
          total: QUIZ_PREVIEW_PAYLOAD.total,
          questions: QUIZ_PREVIEW_PAYLOAD.questions,
        }
  /** 题目是嵌套对象数组，通用字段推导会过滤集合值；测验单独深拷贝完整题库。 */
  const row = fields.reduce<WidgetOptionRecord>((result, field) => {
    if (!(field.optionKey in sourceOption)) return result
    const value = sourceOption[field.optionKey]
    if (field.optionKey === 'questions' && Array.isArray(value)) {
      result[field.sourceField] = cloneDeep(value)
    } else if (isStaticCellValue(value)) {
      result[field.sourceField] = value
    }
    return result
  }, {})
  const source = Object.keys(row).length > 0 ? [row] : []
  if (source.length === 0) return null
  return createWidgetDataConfig(
    source,
    fields
      .filter((field) => field.sourceField in row)
      .map((field) =>
        createWidgetBinding(
          field.optionKey,
          field.sourceField,
          inferValueType(row[field.sourceField]),
        ),
      ),
  )
}

/**
 * 从普通 DOM 部件 option 中反推右侧数据面板可编辑的默认静态数据。
 *
 * 只采集真正参与数据语义的字段，例如 value、dataset、options、分页值；
 * 颜色、字号、边框等样式项继续留在基础/样式配置面板，避免数据面板被视觉配置污染。
 */
export const inferWidgetDataConfigFromOption = (
  packageName: string,
  keyName: string,
  option: WidgetOptionRecord,
): ComponentDataConfig | null => {
  /** 市场图片默认数据使用稳定编号，避免保存临时地址后在换环境或地址过期时失效。 */
  if (packageName === 'Widget' && keyName === 'VImage' && option.sourceType === 'resource-market') {
    return inferFieldWidgetDataConfig(
      { value: option.resourceKey ?? '' },
      [{ optionKey: 'value', sourceField: 'value' }],
    )
  }
  if (packageName === 'Widget' && keyName === QUIZ_WIDGET_KEY_NAME) {
    return inferQuizWidgetDataConfig(option)
  }
  if (LIST_WIDGET_KEY_NAMES.has(keyName)) {
    return inferListWidgetDataConfig(option)
  }

  if (OPTION_CONTENT_WIDGET_KEY_NAMES.has(keyName)) {
    return inferOptionContentWidgetDataConfig(option)
  }

  if (PAGINATION_WIDGET_KEY_NAMES.has(keyName)) {
    return inferPaginationWidgetDataConfig(option)
  }

  if (DATASET_VALUE_WIDGET_KEY_NAMES.has(keyName) && 'dataset' in option) {
    return inferFieldWidgetDataConfig(
      option,
      [{ optionKey: 'dataset', sourceField: 'value' }],
    )
  }

  if ('value' in option) {
    return inferFieldWidgetDataConfig(option, [{ optionKey: 'value', sourceField: 'value' }])
  }

  if (packageName === 'Decorate' && 'dataset' in option) {
    return inferFieldWidgetDataConfig(option, [{ optionKey: 'dataset', sourceField: 'value' }])
  }

  return null
}

export const isDatasetValueWidgetKeyName = (keyName: string | undefined) =>
  Boolean(keyName && DATASET_VALUE_WIDGET_KEY_NAMES.has(keyName))
