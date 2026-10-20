import type { ActionItem, SceneAllContentsItem, SceneWidgetTargetItem } from '@/types/threeScene'
import { isEditorThreeDimensionalComponentContent } from '@/integrations/scene/editorSceneObjectTree'
import { getSceneObjectTargetOptionValue } from '@/utils/renderScene/sceneObjectTargetResolver'

export type ParameterSourceType = 'current' | NonNullable<ActionItem['parameterTargetKind']>
interface SourceOption {
  value: string
  label: string
}

/** 按现有目标分类建立一次候选和编号索引，供所有动作复用，避免渲染时逐动作过滤全场景。 */
export const buildParameterComponentOptions = (
  widgets: readonly Pick<SceneWidgetTargetItem, 'id' | 'name' | 'kindLabel'>[],
  objects: readonly SceneAllContentsItem[],
) => {
  const byType: Record<ParameterSourceType, SourceOption[]> = {
    current: [],
    model: [],
    widget: [],
    'three-dimensional-component': [],
  }
  const typeByValue = new Map<string, ParameterSourceType>()
  for (const widget of widgets) {
    const value = JSON.stringify(['widget', widget.id])
    byType.widget.push({ value, label: `${widget.name}（${widget.kindLabel}）` })
    typeByValue.set(value, 'widget')
  }
  for (const object of objects) {
    const type = isEditorThreeDimensionalComponentContent(object)
      ? 'three-dimensional-component'
      : 'model'
    const value = JSON.stringify(['object', getSceneObjectTargetOptionValue(object)])
    byType[type].push({ value, label: object.name })
    typeByValue.set(value, type)
  }
  return { byType, typeByValue }
}

/** 展示值仅用于下拉定位；当前组件无需选择对象，也不固化为某个实例编号。 */
export const getParameterComponentValue = (action: ActionItem) =>
  action.parameterSource
    ? JSON.stringify([action.parameterSource.kind, action.parameterSource.id])
    : ''

/** 未保存分类的已有来源按真实对象推断；新增配置保存分类以支持空对象的中间编辑状态。 */
export const getParameterSourceType = (
  action: ActionItem,
  typeByValue: ReadonlyMap<string, ParameterSourceType>,
): ParameterSourceType => {
  const source = action.parameterSource
  if (!source) return 'current'
  if (source.kind === 'widget') return 'widget'
  return source.category || typeByValue.get(getParameterComponentValue(action)) || 'model'
}

/** 来源改变后只清除来源请求及字段，保留目标对象和参数，禁止同名字段自动跨对象复用。 */
const clearParameterSourceFields = (action: ActionItem) => {
  for (const mappings of [action.modelParameterMappings, action.widgetParameterMappings]) {
    for (const mapping of mappings || []) {
      delete mapping.sourceRequestId
      mapping.sourceField = ''
    }
  }
}

/** 选择具体类型时先清空对象；切回当前组件则删除显式来源，继续使用触发上下文。 */
export const setParameterSourceType = (action: ActionItem, type: ParameterSourceType) => {
  if (type === 'current') delete action.parameterSource
  else
    action.parameterSource =
      type === 'widget' ? { kind: 'widget', id: '' } : { kind: 'object', id: '', category: type }
  clearParameterSourceFields(action)
}

/** 对象下拉只接受当前类型的真实候选，避免事件或失效选项把分类与对象归属写成矛盾状态。 */
export const setParameterSourceComponent = (
  action: ActionItem,
  value: string,
  typeByValue: ReadonlyMap<string, ParameterSourceType>,
) => {
  const type = getParameterSourceType(action, typeByValue)
  if (type === 'current' || typeByValue.get(value) !== type) return
  const [kind, id] = JSON.parse(value) as ['widget' | 'object', string]
  action.parameterSource =
    kind === 'widget'
      ? { kind, id }
      : { kind, id, category: type as 'model' | 'three-dimensional-component' }
  clearParameterSourceFields(action)
}
