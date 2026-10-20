import {
  createEmptyDataConfig,
  type ChartBindingRule,
  type ChartMappingFieldOrigin,
  type ComponentDataBindingRule,
  type ComponentDataConfig,
  type CustomObjectBindingRule,
  type MarkingGenerationRule,
  type ObjectBindingRule,
  type WidgetBindingRule,
} from '@/types/data-config'
import {
  isCustomObjectBindingRule,
  isMarkingBindingRule,
  isObjectBindingRule,
  isWidgetBindingRule,
} from '@/types/data-config'
import { createUuid } from '@/utils/uuid'
import { createDefaultChartRule } from './rightDataPanelDataHelpers'
import type { SelectionKind } from './rightDataPanelConstants'

/** 三维对象当前可直接由 Three 运行时消费的目标字段。 */
export const THREE_OBJECT_BINDING_TARGET_PATHS = [
  'visible',
  'position',
  'rotation',
  'scale',
] as const

type EditableObjectBindingRule = ObjectBindingRule | CustomObjectBindingRule

export interface ObjectManualMappingItem {
  /** 固定属性使用字段名，自定义属性使用持久化 id，避免改名后 Vue 错误复用旧行。 */
  key: string
  targetPath: string
  sourceField: string
}

export interface UpdateObjectManualMappingResult {
  bindings: ComponentDataBindingRule[]
  /** 非空目标字段重复时拒绝写入，但保留页面当前草稿以便用户修正。 */
  duplicateTargetPath?: string
}

/** 将用户输入统一成稳定目标字段名，避免空格导致重复映射或运行时无法命中内置属性。 */
const normalizeObjectBindingTargetPath = (value: string) => value.trim()

const isSupportedObjectBindingTargetPath = (
  value: string,
): value is ObjectBindingRule['targetPath'] =>
  THREE_OBJECT_BINDING_TARGET_PATHS.some((item) => item === value)

const getObjectBindingItemKey = (binding: EditableObjectBindingRule) =>
  isObjectBindingRule(binding) ? `object:${binding.targetPath}` : `object-custom:${binding.id}`

const isEditableObjectBindingRule = (
  binding: ComponentDataBindingRule,
): binding is EditableObjectBindingRule =>
  isObjectBindingRule(binding) || isCustomObjectBindingRule(binding)

/** 已支持的四个对象属性仍使用精确值类型，保证运行时转换逻辑不发生退化。 */
const getSupportedObjectBindingValueType = (
  targetPath: ObjectBindingRule['targetPath'],
): ObjectBindingRule['valueType'] => {
  if (targetPath === 'visible') return 'boolean'
  if (targetPath === 'rotation') return 'euler'
  return 'vector3'
}

/** 创建空白人工项；空目标与空来源均应持久化，防止用户新增的编辑行被字段刷新清除。 */
export const createCustomObjectBindingRule = (): CustomObjectBindingRule => ({
  kind: 'object-custom',
  id: createUuid(),
  targetPath: '',
  sourceField: '',
  valueType: 'string',
})

/** 将三维对象的标准映射与人工扩展映射统一成面板可渲染的稳定行模型。 */
export const createObjectManualMappingItems = (
  bindings: ComponentDataBindingRule[],
): ObjectManualMappingItem[] =>
  bindings.filter(isEditableObjectBindingRule).map((binding) => ({
    key: getObjectBindingItemKey(binding),
    targetPath: binding.targetPath,
    sourceField: binding.sourceField,
  }))

/** 追加三维人工映射行，不根据当前字段列表推断任何默认目标或来源。 */
export const appendCustomObjectBindingRule = (
  bindings: ComponentDataBindingRule[],
): ComponentDataBindingRule[] => [...bindings, createCustomObjectBindingRule()]

/**
 * 修改三维人工映射的目标字段。
 *
 * 命中当前支持属性时转换回标准对象规则，从而继续驱动运行时；其它输入保留为只持久化的扩展规则。
 * 一个非空目标字段只允许一条规则，避免同一属性被多份来源数据重复覆盖。
 */
export const updateObjectManualBindingTargetPath = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
  value: string,
): UpdateObjectManualMappingResult => {
  const current = bindings.find(
    (binding): binding is EditableObjectBindingRule =>
      isEditableObjectBindingRule(binding) && getObjectBindingItemKey(binding) === itemKey,
  )
  if (!current) return { bindings }

  const targetPath = normalizeObjectBindingTargetPath(value)
  const hasDuplicate =
    Boolean(targetPath) &&
    bindings.some(
      (binding) =>
        binding !== current &&
        isEditableObjectBindingRule(binding) &&
        normalizeObjectBindingTargetPath(binding.targetPath) === targetPath,
    )
  if (hasDuplicate) return { bindings, duplicateTargetPath: targetPath }

  const nextBindings = bindings.map((binding) => {
    if (binding !== current) return binding
    if (isSupportedObjectBindingTargetPath(targetPath)) {
      return {
        kind: 'object' as const,
        targetPath,
        sourceField: current.sourceField,
        valueType: getSupportedObjectBindingValueType(targetPath),
      }
    }

    return {
      kind: 'object-custom' as const,
      id: isCustomObjectBindingRule(current) ? current.id : createUuid(),
      targetPath,
      sourceField: current.sourceField,
      valueType: 'string' as const,
    }
  })
  return { bindings: nextBindings }
}

/** 更新来源字段时不删除空行，保证用户可以先选目标、后选来源，也可以反向操作。 */
export const updateObjectManualBindingSourceField = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
  value?: string,
): ComponentDataBindingRule[] =>
  bindings.map((binding) => {
    if (!isEditableObjectBindingRule(binding) || getObjectBindingItemKey(binding) !== itemKey) {
      return binding
    }
    return { ...binding, sourceField: value || '' }
  })

/** 返回普通控件或打点人工行的稳定键；固定目标继续使用目标路径作为键。 */
const getFixedBindingItemKey = (binding: WidgetBindingRule | MarkingGenerationRule) =>
  binding.id ? `${binding.kind}-custom:${binding.id}` : binding.targetPath

/** 创建用户手动增加的控件映射行，目标和来源均留空，等待用户填写。 */
export const createCustomWidgetBindingRule = (): WidgetBindingRule => ({
  kind: 'widget',
  id: createUuid(),
  targetPath: '',
  sourceField: '',
  valueType: 'string',
})

/** 创建用户手动增加的打点映射行，目标和来源均留空，等待用户填写。 */
export const createCustomMarkingBindingRule = (): MarkingGenerationRule => ({
  kind: 'marking',
  id: createUuid(),
  targetPath: '',
  sourceField: '',
  valueType: 'string',
})

/** 根据当前选中类型追加一条自定义映射，固定目标映射和其它请求规则保持不变。 */
export const appendCustomFixedBindingRule = (
  bindings: ComponentDataBindingRule[],
  selectionKind: Extract<SelectionKind, 'widget' | 'marking'>,
): ComponentDataBindingRule[] => [
  ...bindings,
  selectionKind === 'widget' ? createCustomWidgetBindingRule() : createCustomMarkingBindingRule(),
]

export interface UpdateFixedBindingTargetResult {
  bindings: ComponentDataBindingRule[]
  duplicateTargetPath?: string
}

/** 修改控件或打点人工行的目标字段，保留稳定 id 并拒绝当前请求内的重复目标。 */
export const updateFixedBindingTargetPath = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
  value: string,
): UpdateFixedBindingTargetResult => {
  const current = bindings.find(
    (binding): binding is WidgetBindingRule | MarkingGenerationRule =>
      (isWidgetBindingRule(binding) || isMarkingBindingRule(binding)) &&
      getFixedBindingItemKey(binding) === itemKey &&
      Boolean(binding.id),
  )
  if (!current) return { bindings }

  const targetPath = value.trim()
  const hasDuplicate =
    Boolean(targetPath) &&
    bindings.some(
      (binding) =>
        binding !== current &&
        (isWidgetBindingRule(binding) || isMarkingBindingRule(binding)) &&
        binding.targetPath.trim() === targetPath,
    )
  if (hasDuplicate) return { bindings, duplicateTargetPath: targetPath }

  return {
    bindings: bindings.map((binding) =>
      binding === current
        ? {
            ...binding,
            targetPath,
            valueType:
              targetPath === 'visible'
                ? 'boolean'
                : targetPath === 'total' || targetPath === 'pageSize'
                  ? 'number'
                  : targetPath === 'rotation'
                    ? 'euler'
                    : targetPath === 'position' || targetPath === 'scale'
                      ? 'vector3'
                      : 'string',
            ...(current.kind === 'marking' && targetPath === 'position' ? { required: true } : {}),
          }
        : binding,
    ),
  }
}

/** 修改自定义控件或打点行的来源字段，不按目标路径查找，避免空白行互相覆盖。 */
export const updateFixedBindingSourceField = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
  value?: string,
): ComponentDataBindingRule[] =>
  bindings.map((binding) =>
    (isWidgetBindingRule(binding) || isMarkingBindingRule(binding)) &&
    getFixedBindingItemKey(binding) === itemKey
      ? { ...binding, sourceField: value || '' }
      : binding,
  )

/** 按稳定行键删除控件或打点映射，避免多个空白自定义行因目标字段为空而被一起删除。 */
export const removeFixedBindingRule = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
): ComponentDataBindingRule[] =>
  bindings.filter((binding) => {
    if (!isWidgetBindingRule(binding) && !isMarkingBindingRule(binding)) return true
    return getFixedBindingItemKey(binding) !== itemKey
  })

/** 只删除当前人工映射行，不影响图表、打点或其它类型的绑定规则。 */
export const removeObjectManualBindingRule = (
  bindings: ComponentDataBindingRule[],
  itemKey: string,
): ComponentDataBindingRule[] =>
  bindings.filter(
    (binding) =>
      !isEditableObjectBindingRule(binding) || getObjectBindingItemKey(binding) !== itemKey,
  )

/**
 * 按当前选中对象生成右侧数据面板的最小默认配置。
 * 这里集中维护不同选中类型的默认绑定，避免组件内散落多套初始化分支。
 */
export function createDefaultConfigForSelection(
  selectionKind: SelectionKind,
  isChartWidgetSelection: boolean,
  chartKeyName: string,
  isTableWidgetSelection = false,
): ComponentDataConfig {
  const config = createEmptyDataConfig()
  if (isChartWidgetSelection) {
    config.bindings = [createDefaultChartRule(chartKeyName)]
  }
  if (selectionKind === 'marking') {
    /**
     * 打点继续沿用“实例生成映射”语义。
     * 这里只给出最小默认规则，真正的数据来源允许用户在四种请求方式之间切换。
     */
    config.bindings = [
      {
        kind: 'marking',
        targetPath: 'position',
        sourceField: '',
        valueType: 'vector3',
        required: true,
      },
    ]
  }
  if (selectionKind === 'widget' && !isTableWidgetSelection && chartKeyName !== 'VRecordPagination') {
    /**
     * 控件默认不再生成 `visible` 属性映射。
     * 控件显隐统一通过基础面板和状态/交互动作控制，避免数据映射和动作系统同时控制显隐。
     */
    config.bindings = [
      { kind: 'widget', targetPath: 'value', sourceField: '', valueType: 'string' },
    ]
  }
  return config
}

/**
 * 查找指定目标路径当前映射到的数据字段。
 * 图表绑定使用独立结构，这里只处理对象、打点和控件的普通属性映射。
 */
export function getBindingSourceField(
  bindings: ComponentDataConfig['bindings'],
  targetPath: string,
): string {
  const binding = bindings.find(
    (item) => item.kind !== 'chart' && item.kind !== 'three-map' && item.targetPath === targetPath,
  ) as { sourceField?: string } | undefined
  return binding?.sourceField || ''
}

/**
 * 计算字段匹配状态。
 * 统一返回中文状态文案，组件只负责展示，不再关心判断细节。
 */
export function getFieldStatus(
  field: string,
  availableFields: string[],
): '无' | '匹配成功' | '未匹配' {
  if (!field) return '无'
  return availableFields.includes(field) ? '匹配成功' : '未匹配'
}

/**
 * 生成字段状态标签的样式映射。
 * 用纯函数返回 class 对象，便于模板侧重复复用。
 */
export function createFieldStatusClass(status: string) {
  return {
    'mapping-status': true,
    'is-success': status === '匹配成功',
    'is-warning': status === '未匹配',
  }
}

/**
 * 更新普通属性映射。
 * 值为空时删除映射；有值时按当前选中类型生成新的目标绑定。
 */
export function updateBindingField(
  bindings: ComponentDataConfig['bindings'],
  targetPath: string,
  value: string | undefined,
  selectionKind: SelectionKind,
): ComponentDataConfig['bindings'] {
  const nextBindings = bindings.filter(
    (item) =>
      !(
        item.kind !== 'chart' &&
        item.kind !== 'three-map' &&
        item.targetPath === targetPath
      ),
  )

  if (!value) return nextBindings

  const nextKind =
    selectionKind === 'marking' ? 'marking' : selectionKind === 'widget' ? 'widget' : 'object'
  const nextValueType =
    targetPath === 'visible'
      ? 'boolean'
      : targetPath === 'total' || targetPath === 'pageSize'
        ? 'number'
        : targetPath === 'rotation'
          ? 'euler'
          : targetPath === 'options'
            ? 'string'
            : selectionKind === 'widget'
              ? 'string'
              : 'vector3'

  /**
   * 控件映射面板已不再暴露 `visible`。
   * 这里仍保留旧值类型分支，仅用于兼容历史数据回显或旧场景中的遗留绑定。
   */
  nextBindings.push({
    kind: nextKind,
    targetPath,
    sourceField: value,
    valueType: nextValueType,
    ...(selectionKind === 'marking' && targetPath === 'position' ? { required: true } : {}),
  } as ComponentDataConfig['bindings'][number])

  return nextBindings
}

/**
 * 新增一组图表度量字段占位。
 * 新占位保持空字符串，等待用户手动选择或自动映射补齐。
 */
export function appendChartMeasureField(rule: ChartBindingRule): ChartBindingRule {
  return {
    ...rule,
    measureFields: [...rule.measureFields, ''],
    /**
     * “添加数据项”创建的是人工草稿，不预填 `dataN`：前序请求可能已经占用该目标字段。
     * 空目标会稳定保留到用户输入或主动删除，跨请求校验也不会把它误判为占用。
     */
    targetMeasureFields: [...(rule.targetMeasureFields || []), ''],
    targetMeasureFieldOrigins: [...resolveChartMeasureFieldOrigins(rule), 'manual'],
  }
}

/**
 * 归一图表目标字段的创建来源。
 * 新建场景会明确记录来源；临时缺失标记时按自动识别项保护，避免必要字段被误删。
 */
export function resolveChartMeasureFieldOrigins(rule: ChartBindingRule): ChartMappingFieldOrigin[] {
  return rule.measureFields.map((_, index) => rule.targetMeasureFieldOrigins?.[index] || 'inferred')
}

/**
 * 将用户删除的自动目标字段写入请求级记录。
 *
 * 自动识别只负责补齐未删除的字段；记录目标字段而非来源字段，能够在接口字段改名、
 * 刷新或切换请求方式后仍准确保持用户的删除意图。
 */
export function recordDeletedAutoMappingTarget(
  config: ComponentDataConfig,
  targetField: string | undefined,
): ComponentDataConfig {
  const normalizedTarget = targetField?.trim()
  if (!normalizedTarget) return config

  const deletedTargets = new Set(config.deletedAutoMappingTargets || [])
  deletedTargets.add(normalizedTarget)
  return {
    ...config,
    deletedAutoMappingTargets: [...deletedTargets],
  }
}

/**
 * 按当前可用字段同步二维控件的默认映射。
 *
 * 普通控件的目标字段是固定的，但来源字段会随着静态数据、接口结果或数据集字段变化。
 * 因此自动补齐必须集中处理两种边界：
 * - 目标字段已被用户删除时，不能再次创建绑定；
 * - 前序请求已经占用的目标字段不能再次创建绑定，保证组件与图表使用相同的请求级隔离规则。
 *
 * 该函数保留已有人工来源，只在来源缺失或失效时按默认同名字段补齐，且直接修改传入配置，
 * 与原面板同步流程的响应式写回方式一致。
 */
export const syncWidgetBindingsWithAvailableFields = (
  config: ComponentDataConfig,
  targets: ReadonlyArray<{ targetPath: string }>,
  availableFields: readonly string[],
  occupiedTargets: ReadonlySet<string> = new Set(),
) => {
  const deletedTargets = new Set(
    (config.deletedAutoMappingTargets || []).map((field) => field.trim()).filter(Boolean),
  )
  const targetPathSet = new Set(targets.map((target) => target.targetPath))
  let nextBindings = config.bindings.filter(
    (item) => !isWidgetBindingRule(item) || targetPathSet.has(item.targetPath),
  )
  const normalizedOccupiedTargets = new Set(
    [...occupiedTargets].map((field) => field.trim()).filter(Boolean),
  )

  targets.forEach((target) => {
    const defaultField = target.targetPath
    const currentBinding = nextBindings.find(
      (item): item is WidgetBindingRule =>
        isWidgetBindingRule(item) && item.targetPath === target.targetPath,
    )
    // 带稳定 id 的行是用户手动创建的，即使来源字段暂时失效也不能被自动规则改写或替换。
    if (currentBinding?.id) return
    if (
      normalizedOccupiedTargets.has(defaultField) ||
      deletedTargets.has(defaultField) ||
      !availableFields.includes(defaultField)
    ) {
      // 与图表自动映射一致：前序请求占用目标字段时，当前请求的自动行整体移除，
      // 不能只清空来源字段，否则后续刷新仍可能把它重新识别为可补齐的自动映射。
      // 空静态请求同样不应保留没有来源的默认行，否则它会无意义地占用目标字段。
      if (currentBinding) {
        nextBindings = nextBindings.filter((binding) => binding !== currentBinding)
      }
      return
    }
    if (currentBinding && availableFields.includes(currentBinding.sourceField)) return

    nextBindings = updateBindingField(nextBindings, target.targetPath, defaultField, 'widget')
  })

  config.bindings = nextBindings
  return config
}

/**
 * 删除图表维度映射并返回记录前的目标字段。
 *
 * 空目标配合 `deletedAutoMappingTargets` 让运行时跳过该映射；自动补齐函数会读取同一记录，
 * 因而不会在字段刷新后重新生成被用户删除的维度行。
 */
export function removeChartDimensionField(rule: ChartBindingRule): {
  rule: ChartBindingRule
  targetField: string
} {
  return {
    rule: {
      ...rule,
      targetDimensionField: '',
      dimensionField: '',
    },
    // 显式空目标表示该自动行已经被删除，不能回退读取来源字段并错误记录删除目标。
    targetField:
      rule.targetDimensionField === undefined
        ? rule.dimensionField.trim()
        : rule.targetDimensionField.trim(),
  }
}

/** 返回指定度量行的目标字段，供调用方删除前写入请求级删除记录。 */
export function getChartMeasureTargetFieldAt(rule: ChartBindingRule, index: number): string {
  // 与运行时目标解析保持一致：数组中显式的空字符串是合法空目标，不能回退为来源字段。
  const hasExplicitTarget =
    Array.isArray(rule.targetMeasureFields) && index < rule.targetMeasureFields.length
  return hasExplicitTarget
    ? rule.targetMeasureFields?.[index]?.trim() || ''
    : rule.measureFields[index]?.trim() || ''
}

/**
 * 删除一组图表度量字段，并同步刷新单序列/多序列模式。
 *
 * 自动识别行与人工新增行使用完全相同的删除路径。调用方在删除自动行前通过
 * `getChartMeasureTargetFieldAt` 和 `recordDeletedAutoMappingTarget` 保存用户意图；
 * 空数组是合法状态，后续用户仍可通过“添加数据项”主动创建新行。
 */
export function removeChartMeasureFieldAt(rule: ChartBindingRule, index: number): ChartBindingRule {
  const currentOrigins = resolveChartMeasureFieldOrigins(rule)
  if (index < 0 || index >= rule.measureFields.length) return rule

  const nextMeasureFields = rule.measureFields.filter((_, currentIndex) => currentIndex !== index)
  const nextTargetMeasureFields = (rule.targetMeasureFields || []).filter(
    (_, currentIndex) => currentIndex !== index,
  )
  const nextOrigins = currentOrigins.filter((_, currentIndex) => currentIndex !== index)
  return {
    ...rule,
    measureFields: nextMeasureFields,
    targetMeasureFields: nextTargetMeasureFields,
    targetMeasureFieldOrigins: nextOrigins,
    seriesMode: nextMeasureFields.filter(Boolean).length > 1 ? 'multi' : 'single',
  }
}

/**
 * 更新人工新增项的组件目标字段名。
 * 自动识别项在写入边界再次校验为只读，防止调用方绕过界面直接改坏组件必要字段。
 */
export function updateChartTargetMeasureFieldAt(
  rule: ChartBindingRule,
  index: number,
  value: string,
): ChartBindingRule {
  if (resolveChartMeasureFieldOrigins(rule)[index] !== 'manual') return rule

  const nextTargetMeasureFields = [...(rule.targetMeasureFields || [])]
  // 目标字段与三维人工字段一样统一去除首尾空格，避免肉眼相同的字段绕过跨请求唯一校验。
  nextTargetMeasureFields[index] = value.trim()
  return {
    ...rule,
    targetMeasureFields: nextTargetMeasureFields,
  }
}

/**
 * 更新指定度量字段，并同步刷新系列模式。
 * 当有效度量字段多于一组时自动切到多序列。
 */
export function updateChartMeasureFieldAt(
  rule: ChartBindingRule,
  index: number,
  value?: string,
): ChartBindingRule {
  const nextMeasureFields = [...rule.measureFields]
  nextMeasureFields[index] = value || ''
  return {
    ...rule,
    measureFields: nextMeasureFields,
    seriesMode: nextMeasureFields.filter(Boolean).length > 1 ? 'multi' : 'single',
  }
}
