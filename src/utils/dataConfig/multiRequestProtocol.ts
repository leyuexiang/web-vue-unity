import { cloneDeep } from 'lodash-es'
import {
  DATA_REQUEST_ITEM_LIMIT,
  CHART_AUTO_MEASURE_FIELD_LIMIT,
  createDataConfigRequestItem,
  createEmptyDataConfig,
  createStaticDataRequestItem,
  getDataConfigRequests,
  isChartBindingRule,
  type ComponentDataBindingRule,
  type ComponentDataConfig,
  type ComponentDataRequestItem,
} from '@/types/data-config'

/**
 * 规整请求项列表：最多保留五项，名称按界面顺序生成，首项为空时恢复静态请求。
 * 该函数只返回深拷贝，面板编辑中的对象不会被运行时读取过程意外修改。
 */
export const normalizeDataRequestItems = (
  config: ComponentDataConfig | null | undefined,
  exampleData: unknown = [],
): ComponentDataRequestItem[] => {
  const rawItems = getDataConfigRequests(config)
  const items = rawItems.slice(0, DATA_REQUEST_ITEM_LIMIT).map((item, index) => {
    const cloned = cloneDeep(item)
    const staticData =
      cloned.request?.type === 'static' && cloned.request.config && 'data' in cloned.request.config
        ? cloned.request.config.data
        : undefined
    const source = cloned.dataset?.source?.length
      ? cloned.dataset.source
      : staticData !== undefined
        ? normalizeRows(staticData)
        : index === 0
          ? normalizeRows(exampleData)
          : []
    const dimensions = cloned.dataset?.dimensions?.length
      ? [...cloned.dataset.dimensions]
      : source[0]
        ? Object.keys(source[0])
        : []
    return createDataConfigRequestItem({
      ...cloned,
      id: cloned.id || `request-${index + 1}`,
      name: `请求${index + 1}`,
      collapsed: Boolean(cloned.collapsed),
      dataset: { dimensions, source },
      bindings: cloned.bindings || [],
      deletedAutoMappingTargets: cloned.deletedAutoMappingTargets || [],
    })
  })

  return items.length > 0 ? items : [createStaticDataRequestItem(exampleData, 'request-1')]
}

/** 追加请求项；达到上限时返回原配置深拷贝，调用方可据此提示用户。 */
export const appendDataRequestItem = (
  config: ComponentDataConfig | null | undefined,
  item?: Partial<ComponentDataRequestItem>,
): ComponentDataConfig => {
  const next = cloneDeep(config || createEmptyDataConfig())
  const requests = normalizeDataRequestItems(next)
  if (requests.length < DATA_REQUEST_ITEM_LIMIT) {
    const existingIds = new Set(requests.map((request) => request.id))
    let nextItem = createDataConfigRequestItem({
      ...item,
      name: `请求${requests.length + 1}`,
    })
    // 热更新或导入外部配置后，内存编号可能与持久化编号重叠；遇到重叠立即重新分配。
    while (existingIds.has(nextItem.id)) {
      nextItem = createDataConfigRequestItem({
        ...item,
        id: undefined,
        name: `请求${requests.length + 1}`,
      })
    }
    requests.push(nextItem)
  }
  next.requests = requests
  syncRequestMirror(next, requests[0])
  return next
}

/** 删除指定请求；删除最后一项时恢复带示例数据的静态请求1。 */
export const removeDataRequestItem = (
  config: ComponentDataConfig | null | undefined,
  requestId: string,
  exampleData?: unknown,
): ComponentDataConfig => {
  const next = cloneDeep(config || createEmptyDataConfig(exampleData))
  const currentItems = normalizeDataRequestItems(next, exampleData)
  const removed = currentItems.find((item) => item.id === requestId)
  const remaining = currentItems.filter((item) => item.id !== requestId)
  // 未显式传入示例数据时，优先从被删静态请求的内容取回原始展示数据，避免删除最后一项后图表变空。
  const fallbackData =
    exampleData !== undefined && exampleData !== null && exampleData !== ''
      ? exampleData
      : removed?.request.type === 'static' && 'data' in removed.request.config
        ? removed.request.config.data
        : removed?.dataset.source || []
  const requests =
    remaining.length > 0 ? remaining : [createStaticDataRequestItem(fallbackData, 'request-1')]
  next.requests = requests.map((item, index) => ({ ...item, name: `请求${index + 1}` }))
  syncRequestMirror(next, next.requests[0])
  return next
}

/**
 * 解析图表维度目标字段。
 *
 * 目标字段显式为空表示用户已经删除或尚未配置，不能回退成来源字段；只有旧配置完全缺少
 * `targetDimensionField` 时才使用来源字段兜底，避免空白人工行和已删除行重新占用字段。
 */
export const resolveChartDimensionTargetField = (
  binding: ComponentDataBindingRule & { kind: 'chart' },
) =>
  binding.targetDimensionField === undefined
    ? binding.dimensionField.trim()
    : binding.targetDimensionField.trim()

/**
 * 解析图表度量目标字段，规则与维度字段一致。
 *
 * `targetMeasureFields[index] = ''` 是合法的人工占位状态，运行时和字段占用校验都必须把它
 * 当作未配置，而不是回退为同名来源字段。
 */
export const resolveChartMeasureTargetField = (
  binding: ComponentDataBindingRule & { kind: 'chart' },
  index: number,
) => {
  const hasExplicitTarget =
    Array.isArray(binding.targetMeasureFields) && index < binding.targetMeasureFields.length
  const targetField = hasExplicitTarget
    ? binding.targetMeasureFields?.[index]?.trim() || ''
    : binding.measureFields[index]?.trim() || ''
  const origin = binding.targetMeasureFieldOrigins?.[index] || 'inferred'
  // 仅拦截自动生成的 dataN/valueN 超范围字段；人工自定义目标仍可参与既有历史配置。
  const generatedFieldMatch = /^(data|value)(\d*)$/.exec(targetField)
  if (origin === 'inferred' && generatedFieldMatch) {
    const ordinal = generatedFieldMatch[2] ? Number(generatedFieldMatch[2]) : 1
    if (ordinal > CHART_AUTO_MEASURE_FIELD_LIMIT) return ''
  }
  return targetField
}

/** 返回指定请求之前已经占用的目标字段，供后续请求下拉禁用重复选项。 */
export const getOccupiedTargetFieldsBefore = (
  requests: ComponentDataRequestItem[],
  requestIndex: number,
): Set<string> => {
  const occupied = new Set<string>()
  requests.slice(0, requestIndex).forEach((request) => {
    getRequestTargetFields(request).forEach((field) => occupied.add(field))
  })
  return occupied
}

/**
 * 以数组形式返回请求项中的所有非空目标字段。
 *
 * 该内部函数保留重复值，供保存前校验发现同一请求内的重复目标；对外的占用查询再转为 Set。
 */
const getRequestTargetFieldList = (request: ComponentDataRequestItem): string[] => {
  const fields: string[] = []
  request.bindings.forEach((binding) => {
    if (isChartBindingRule(binding)) {
      // 只有来源和目标同时存在才是真实绑定；清空来源后的悬空目标不能继续占用字段。
      if (binding.dimensionField?.trim()) {
        addField(fields, resolveChartDimensionTargetField(binding))
      }
      binding.measureFields.forEach((sourceField, index) => {
        const targetField = resolveChartMeasureTargetField(binding, index)
        const origin = binding.targetMeasureFieldOrigins?.[index] || 'inferred'
        // 图表人工新增行填写目标后立即占位；自动行仍要求来源和目标同时存在。
        if (origin === 'manual' && targetField) {
          addField(fields, targetField)
          return
        }
        if (sourceField?.trim()) addField(fields, targetField)
      })
      return
    }
    if ('targetPath' in binding && binding.targetPath?.trim()) {
      const sourceField = 'sourceField' in binding ? binding.sourceField?.trim() : ''
      const isManualBinding = binding.kind === 'object' || ('id' in binding && Boolean(binding.id))
      // 自动行必须来源、目标同时存在；人工行填写目标后立即占位，支持先填目标再填来源。
      if (isManualBinding || sourceField) addField(fields, binding.targetPath)
    }
  })
  return fields
}

/** 获取一个请求项的所有非空目标字段，图表的维度和每个度量均计入。 */
export const getRequestTargetFields = (request: ComponentDataRequestItem): Set<string> => {
  const fields = new Set<string>()
  getRequestTargetFieldList(request).forEach((field) => fields.add(field))
  return fields
}

/** 跨请求汇总所有目标字段；同名字段只保留一份。 */
export const getAllTargetFields = (requests: ComponentDataRequestItem[]): string[] => {
  const fields = new Set<string>()
  requests.forEach((request) =>
    getRequestTargetFields(request).forEach((field) => fields.add(field)),
  )
  return [...fields]
}

/** 与类型层同名工具保持一致，便于调用方按配置项列表获取字段占用集合。 */
export const getOccupiedDataConfigTargetFields = (
  requests: ComponentDataRequestItem[],
  currentIndex = requests.length,
) => getOccupiedTargetFieldsBefore(requests, currentIndex)

/** 判断字段是否能在当前请求中使用；当前请求自身的字段不会被误判为重复。 */
export const isTargetFieldAvailable = (
  requests: ComponentDataRequestItem[],
  requestIndex: number,
  targetField: string,
  _currentField?: string,
) => {
  const normalized = targetField.trim()
  if (!normalized) return true
  // 当前请求整体被排除，编辑已有行时也会检查后序请求，保证目标字段真正全局唯一。
  const occupied = new Set<string>()
  requests.forEach((request, index) => {
    if (index === requestIndex) return
    getRequestTargetFields(request).forEach((field) => occupied.add(field))
  })
  return !occupied.has(normalized)
}

/**
 * 返回所有重复目标字段，供保存前作最终兜底。
 *
 * 面板交互会优先阻止重复输入；这里仍覆盖导入、历史草稿和异步回写等绕过交互入口的情况，
 * 确保运行时不会按请求顺序覆盖同一目标字段。
 */
export const getDuplicateTargetFields = (requests: ComponentDataRequestItem[]): string[] => {
  const used = new Set<string>()
  const duplicates = new Set<string>()
  requests.forEach((request) => {
    getRequestTargetFieldList(request).forEach((field) => {
      if (used.has(field)) duplicates.add(field)
      else used.add(field)
    })
  })
  return [...duplicates]
}

/**
 * 将各请求已经完成映射的行按行号合成图表快照。
 * 不合并原始响应；某请求没有对应行时，为其目标字段填充空字符串。
 */
export const composeChartTargetRows = (
  snapshots: Array<{ rows: Record<string, unknown>[]; bindings: ComponentDataBindingRule[] }>,
): Record<string, unknown>[] => {
  const maxRows = snapshots.reduce((max, snapshot) => Math.max(max, snapshot.rows.length), 0)
  const result = Array.from({ length: maxRows }, () => ({}) as Record<string, unknown>)
  snapshots.forEach(({ rows, bindings }) => {
    bindings.filter(isChartBindingRule).forEach((binding) => {
      const dimensionTarget = resolveChartDimensionTargetField(binding)
      const dimensionSource = binding.dimensionField?.trim()
      if (dimensionTarget && dimensionSource) {
        for (let index = 0; index < maxRows; index += 1) {
          result[index][dimensionTarget] = rows[index]?.[dimensionSource] ?? ''
        }
      }
      binding.measureFields.forEach((sourceValue, measureIndex) => {
        const sourceField = sourceValue?.trim()
        const targetField = resolveChartMeasureTargetField(binding, measureIndex)
        if (!sourceField || !targetField) return
        for (let index = 0; index < maxRows; index += 1) {
          result[index][targetField] = rows[index]?.[sourceField] ?? ''
        }
      })
    })
  })
  return result
}

/** 兼容旧函数命名，便于运行时和测试按“快照合成”语义调用。 */
export const mergeChartRequestSnapshots = composeChartTargetRows

const addField = (set: Set<string> | string[], value: string | undefined) => {
  const field = value?.trim()
  if (!field) return
  if (set instanceof Set) set.add(field)
  else set.push(field)
}

const normalizeRows = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data.map((item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? cloneDeep(item as Record<string, unknown>)
        : { value: item },
    )
  }
  if (data && typeof data === 'object') return [cloneDeep(data as Record<string, unknown>)]
  return data === undefined || data === null ? [] : [{ value: data }]
}

const syncRequestMirror = (config: ComponentDataConfig, first?: ComponentDataRequestItem) => {
  if (!first) return
  config.request = first.request
  config.extractor = first.extractor
  config.dataset = first.dataset
  config.bindings = first.bindings
  config.filterFn = first.filterFn
}
