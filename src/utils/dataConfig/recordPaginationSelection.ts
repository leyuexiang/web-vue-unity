import { toRaw } from 'vue'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { ComponentDataConfig } from '@/types/data-config'
import { getDataConfigRequests } from '@/types/data-config'

export interface RecordPaginationSelection {
  requestId: string
  row: Record<string, unknown>
}
/** 弱引用按组件实例隔离当前记录；不写数据集首条、持久化配置或事件参数。 */
const selections = new WeakMap<BaseWidgetConfig, RecordPaginationSelection>()
/** 稳定编号用于历史回放替换配置对象后的取值；销毁时显式清理。 */
const selectionsById = new Map<
  string,
  { owner: BaseWidgetConfig; selection: RecordPaginationSelection }
>()
export const setRecordPaginationSelection = (
  component: BaseWidgetConfig,
  selection?: RecordPaginationSelection,
  widgetId?: string,
) => {
  const owner = toRaw(component)
  if (selection) {
    selections.set(owner, selection)
    if (widgetId) selectionsById.set(widgetId, { owner, selection })
  } else {
    selections.delete(owner)
    if (widgetId && selectionsById.get(widgetId)?.owner === owner) selectionsById.delete(widgetId)
  }
}
export const getRecordPaginationSelection = (component?: BaseWidgetConfig, widgetId?: string) =>
  component?.info?.keyName === 'VRecordPagination'
    ? widgetId
      ? selectionsById.get(widgetId)?.selection
      : selections.get(toRaw(component))
    : undefined

/**
 * 在事件读取期间创建一行只读投影，复用原请求的属性映射。
 * 来源请求必须精确匹配；其他请求与普通组件不受选中记录影响。
 */
export const projectRecordPaginationSelection = (
  config: ComponentDataConfig,
  selection: RecordPaginationSelection,
) => ({
  ...config,
  requests: getDataConfigRequests(config).map((item) =>
    item.id === selection.requestId
      ? { ...item, dataset: { ...item.dataset, source: [selection.row] } }
      : item,
  ),
})
