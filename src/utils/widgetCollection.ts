import type { WidgetConfig } from '@/stores/sceneEditStore'

/**
 * 按部件 id 做线性去重。
 * 场景回显时如果仍用 filter + findIndex，会在大场景里退化成 O(N²)。
 * 这里改成 Set 一次遍历，保留“第一次出现的实例”为最终结果，语义与原逻辑保持一致。
 */
export const deduplicateWidgetsById = (widgets: WidgetConfig[]) => {
  const seenWidgetIdSet = new Set<string>()
  const deduplicatedWidgets: WidgetConfig[] = []

  widgets.forEach((widget) => {
    if (seenWidgetIdSet.has(widget.id)) return
    seenWidgetIdSet.add(widget.id)
    deduplicatedWidgets.push(widget)
  })

  return deduplicatedWidgets
}
