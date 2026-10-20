import { cloneDeep, set } from 'lodash-es'
import type { ChartBindingRule, ComponentDataConfig } from '@/types/data-config'
import {
  getDatasetFieldNames,
  isChartBindingRule,
  isCustomObjectBindingRule,
  isObjectBindingRule,
  isWidgetBindingRule,
  isMarkingBindingRule,
  getDataConfigRequests,
} from '@/types/data-config'
import { resolveChartDimensionTargetField, resolveChartMeasureTargetField } from './multiRequestProtocol'

const normalizeFieldName = (value: string | null | undefined) => value?.trim() || ''

/**
 * 把一条图表映射写入组件字段快照。
 *
 * `target*` 表示组件真正接收的字段，`dimensionField / measureFields` 表示接口来源字段；
 * 两组字段必须按索引映射，不能因为字段同名就跳过。人工字段同样走这条路径，因此
 * `data3 ← data1` 会得到 `result.data3 = source.data1`。
 */
const applyChartBindingToRow = (
  result: Record<string, unknown>,
  source: Record<string, unknown>,
  binding: ChartBindingRule,
) => {
  const targetDimensionField = normalizeFieldName(resolveChartDimensionTargetField(binding))
  const sourceDimensionField = normalizeFieldName(binding.dimensionField)
  if (targetDimensionField && sourceDimensionField && sourceDimensionField in source) {
    result[targetDimensionField] = source[sourceDimensionField]
  }

  binding.measureFields.forEach((sourceFieldValue, index) => {
    const sourceField = normalizeFieldName(sourceFieldValue)
    const targetField = normalizeFieldName(resolveChartMeasureTargetField(binding, index))
    if (!sourceField || !targetField || !(sourceField in source)) return
    result[targetField] = source[sourceField]
  })
}

/**
 * 把三维对象人工映射写入规则运行时使用的字段快照。
 *
 * 规则配置选择的是映射目标字段（例如 `visible`），而接口返回的是来源字段；
 * 这里按映射关系补出目标值，保证状态/事件条件与右侧数据面板看到的是同一份数据。
 * 自定义目标字段同样只影响数据快照，不会改变 Three 对象运行时属性。
 */
const applyObjectBindingToRow = (
  result: Record<string, unknown>,
  source: Record<string, unknown>,
  binding: { targetPath: string; sourceField: string },
) => {
  const targetPath = normalizeFieldName(binding.targetPath)
  const sourceField = normalizeFieldName(binding.sourceField)
  if (!targetPath || !sourceField || !(sourceField in source)) return

  // 使用路径写入兼容自定义字段的层级表达式，内置四类三维属性仍保持扁平字段行为。
  set(result, targetPath, source[sourceField])
}

/**
 * 生成“当前组件数据”的首行快照。
 *
 * 返回值先保留过滤结果原字段以兼容已保存规则，再叠加属性映射后的组件目标字段。
 * 图表、三维对象和普通部件的人工字段因此可直接参与状态与事件条件；自定义三维字段只进入
 * 数据快照，不会绕过运行时边界写入 Three 对象。
 */
export const resolveComponentMappedDataRow = (
  dataConfig: ComponentDataConfig | null | undefined,
): Record<string, unknown> | null => {
  const requests = getDataConfigRequests(dataConfig)
  if (requests.length === 0) return null

  /**
   * 目标字段支持 `device.state` 这类嵌套路径。浅拷贝只复制首层，后续 `set` 会复用并修改
   * sourceRow 中已有的嵌套对象，导致条件计算反向污染数据源；这里创建独立快照，保证映射
   * 只影响本次返回值，不改变 dataConfig.dataset.source 的原始记录。
   */
  const firstSource = requests.find((request) => request.dataset.source?.[0])?.dataset.source?.[0]
  if (!firstSource || typeof firstSource !== 'object') return null
  const result = cloneDeep(firstSource)
  requests.forEach((request) => {
    const sourceRow = request.dataset.source?.[0]
    if (!sourceRow || typeof sourceRow !== 'object') return
    request.bindings.forEach((binding) => {
      if (isChartBindingRule(binding)) {
        applyChartBindingToRow(result, sourceRow, binding)
        return
      }
      if (
        isObjectBindingRule(binding) ||
        isCustomObjectBindingRule(binding) ||
        isWidgetBindingRule(binding) ||
        // 打点等三维组件的属性映射也可供传参读取。
        isMarkingBindingRule(binding)
      ) {
        applyObjectBindingToRow(result, sourceRow, binding)
      }
    })
  })
  return result
}

/**
 * 构建规则弹窗的“当前组件数据”候选字段。
 *
 * 原始数据字段按数据集顺序保留，随后追加图表和三维对象映射目标字段并去重；使用单个
 * Set 完成去重，避免每渲染一个选项都重复扫描映射数组。人工字段只有名称非空且已绑定
 * 来源时才可配置为条件，避免把尚未完成的占位行暴露给规则编辑器。
 */
export const buildComponentMappedDataFieldOptions = (
  dataConfig: ComponentDataConfig | null | undefined,
) => {
  if (!dataConfig) return []

  const requests = getDataConfigRequests(dataConfig)
  const fields = new Set(
    requests
      .flatMap((request) =>
        getDatasetFieldNames({ ...dataConfig, dataset: request.dataset }).map(normalizeFieldName),
      )
      .filter(Boolean),
  )
  requests.flatMap((request) => request.bindings.filter(isChartBindingRule)).forEach((binding) => {
    const targetDimensionField = normalizeFieldName(binding.targetDimensionField)
    if (targetDimensionField && normalizeFieldName(binding.dimensionField)) {
      fields.add(targetDimensionField)
    }

    binding.measureFields.forEach((sourceField, index) => {
      const targetField = normalizeFieldName(resolveChartMeasureTargetField(binding, index))
      if (targetField && normalizeFieldName(sourceField)) fields.add(targetField)
    })
  })
  requests
    .flatMap((request) => request.bindings)
    .filter(
      (binding) =>
        isObjectBindingRule(binding) ||
        isCustomObjectBindingRule(binding) ||
        isWidgetBindingRule(binding),
    )
    .forEach((binding) => {
      const targetPath = normalizeFieldName(binding.targetPath)
      const sourceField = normalizeFieldName(binding.sourceField)
      if (targetPath && sourceField) fields.add(targetPath)
    })
  return [...fields]
}
