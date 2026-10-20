import { cloneDeep, isArray } from 'lodash-es'

type TableOptionRecord = Record<string, unknown>

const ROOT_PROTECTED_KEYS = new Set(['label', 'visible', 'variant', 'dataConfig'])

const isRecord = (value: unknown): value is TableOptionRecord =>
  !!value && typeof value === 'object' && !isArray(value)

/**
 * 生成表格“样式 JSON”的可编辑快照。
 *
 * 数据边界：
 * - `dataset.source` 和数组形态的 `dataset` 都是真实业务数据，不允许在样式入口修改；
 * - 对象形态 `dataset.dimensions` 是表头展示配置，需要保留，才能与“表头名称”控件双向同步；
 * - 名称、显隐、组件预设和数据绑定由其他面板维护，避免样式 JSON 越权覆盖运行时状态。
 */
export const createTableStyleOption = (option: unknown): TableOptionRecord => {
  if (!isRecord(option)) return {}

  const styleOption = cloneDeep(option)
  ROOT_PROTECTED_KEYS.forEach((key) => delete styleOption[key])

  if (isArray(styleOption.dataset)) {
    delete styleOption.dataset
  } else if (isRecord(styleOption.dataset)) {
    delete styleOption.dataset.source
    if (Object.keys(styleOption.dataset).length === 0) delete styleOption.dataset
  }

  return styleOption
}

/**
 * 把样式 JSON 原位写回当前配置，保持 Vue 已持有的 option 引用稳定。
 * 先清除旧的可编辑字段，再恢复受保护字段和真实数据，可让 JSON 删除字段同样准确生效，
 * 同时避免替换整个对象导致画布组件、属性控件或数据绑定持有过期引用。
 */
export const applyTableStyleOption = (option: unknown, styleOption: unknown): void => {
  if (!isRecord(option) || !isRecord(styleOption)) return

  const protectedValues = new Map<string, unknown>()
  ROOT_PROTECTED_KEYS.forEach((key) => {
    if (key in option) protectedValues.set(key, option[key])
  })

  const currentDataset = option.dataset
  const nextStyleOption = createTableStyleOption(styleOption)

  Object.keys(option).forEach((key) => {
    if (!ROOT_PROTECTED_KEYS.has(key) && key !== 'dataset') delete option[key]
  })
  Object.assign(option, nextStyleOption)

  if (isArray(currentDataset)) {
    option.dataset = currentDataset
  } else if (isRecord(currentDataset)) {
    const nextDataset = isRecord(nextStyleOption.dataset) ? nextStyleOption.dataset : {}
    option.dataset = {
      ...cloneDeep(nextDataset),
      source: currentDataset.source,
    }
  } else {
    delete option.dataset
  }

  protectedValues.forEach((value, key) => {
    option[key] = value
  })
}
