import { get, set } from 'lodash-es'
import { getDataConfigRequests, type ComponentDataConfig } from '@/types/data-config'
import type { WidgetParameterMapping } from '@/types/sceneInteraction'
import {
  resolveChartDimensionTargetField,
  resolveChartMeasureTargetField,
} from './multiRequestProtocol'
import { resolveComponentMappedDataRow } from './componentMappedData'
import {
  projectRecordPaginationSelection,
  type RecordPaginationSelection,
} from './recordPaginationSelection'

/**
 * 收集属性映射中所有已命名目标，包括尚未绑定来源的手动字段。
 * 候选展示与运行时取值分离：仅空名称占位行不展示，请求编号用于隔离同名字段。
 */
export const buildParameterSourceOptions = (config: ComponentDataConfig | null) =>
  getDataConfigRequests(config).flatMap((request) => {
    const fields = new Set<string>()
    for (const binding of request.bindings) {
      if (binding.kind === 'chart') {
        const dimension = resolveChartDimensionTargetField(binding)
        if (dimension?.trim()) fields.add(dimension.trim())
        // 手动目标数组可能先于来源数组补齐，按两者最大长度保留所有命名字段。
        const count = Math.max(
          binding.measureFields.length,
          binding.targetMeasureFields?.length || 0,
        )
        for (let index = 0; index < count; index += 1) {
          const target = resolveChartMeasureTargetField(binding, index)
          if (target?.trim()) fields.add(target.trim())
        }
      } else if (binding.kind === 'three-map') {
        fields.add(binding.targetField)
      } else if (binding.targetPath.trim()) {
        fields.add(binding.targetPath.trim())
      }
    }
    return [...fields].map((field) => ({
      value: JSON.stringify([request.id, field]),
      label: `${request.name} · ${field}`,
    }))
  })

/**
 * 收集二维组件已经配置的数据映射目标字段，供自定义赋值动作选择。
 * 仅暴露 widget 映射，排除显隐字段：显隐由独立动作维护，属性写入入口会保留其原值。
 */
export const buildWidgetTargetPropertyOptions = (config: ComponentDataConfig | null) => {
  const fields = new Set<string>()
  for (const request of getDataConfigRequests(config)) {
    for (const binding of request.bindings) {
      if (binding.kind !== 'widget') continue
      const targetProperty = binding.targetPath.trim()
      if (targetProperty && targetProperty !== 'visible') fields.add(targetProperty)
    }
  }
  return [...fields].map((field) => ({ value: field, label: field }))
}

/** 选择器值编码请求与字段，保存时拆回明确字段，兼容原有纯字段配置。 */
export const getParameterSourceValue = (mapping: WidgetParameterMapping) =>
  mapping.sourceRequestId
    ? JSON.stringify([mapping.sourceRequestId, mapping.sourceField])
    : mapping.sourceField

export const setParameterSourceValue = (mapping: WidgetParameterMapping, value: string) => {
  const [requestId, field] = JSON.parse(value) as [string, string]
  mapping.sourceRequestId = requestId
  mapping.sourceField = field
}

/** 每个动作对每条请求只计算一次快照；指定请求被删除时返回缺失值，不回退到其它请求。 */
export const createParameterSourceReader = (
  config: ComponentDataConfig | null,
  selection?: RecordPaginationSelection,
  runtimeValues?: Readonly<Record<string, unknown>>,
) => {
  // 逐条翻页的快照先按当前记录投影，再复用现有映射读取；零值和空字符串均保持原类型。
  if (config && selection) config = projectRecordPaginationSelection(config, selection)
  const requests = new Map(getDataConfigRequests(config).map((request) => [request.id, request]))
  const snapshots = new Map<string, Record<string, unknown> | null>()
  return (mapping: WidgetParameterMapping) => {
    const key = mapping.sourceRequestId || ''
    if (!snapshots.has(key)) {
      const request = requests.get(key)
      let snapshot = key
        ? request && config
          ? resolveComponentMappedDataRow({ ...config, requests: [request] })
          : null
        : resolveComponentMappedDataRow(config)
      // 原生控件上报的实时字段优先于接口或默认静态值；只覆盖本请求实际拥有的组件目标。
      // 请求不存在时不允许实时值绕过校验；零值、空字符串和 false 均为合法的新输入。
      if (runtimeValues) {
        const selectedRequests = key ? (request ? [request] : []) : requests.values()
        for (const selected of selectedRequests) {
          for (const binding of selected.bindings) {
            if (binding.kind !== 'widget') continue
            const field = binding.targetPath.trim()
            if (
              !field ||
              !Object.prototype.hasOwnProperty.call(runtimeValues, field) ||
              runtimeValues[field] === undefined
            )
              continue
            snapshot ??= {}
            set(snapshot, field, runtimeValues[field])
          }
        }
      }
      snapshots.set(key, snapshot)
    }
    return get(snapshots.get(key), mapping.sourceField?.trim() || '')
  }
}
