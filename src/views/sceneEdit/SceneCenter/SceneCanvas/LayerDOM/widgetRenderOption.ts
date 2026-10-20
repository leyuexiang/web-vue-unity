import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { buildWidgetRuntimeOption } from '@/utils/dataConfig'

/**
 * 集中决定画布部件本次渲染应消费的配置。
 *
 * 该入口从 LayerDOM 的列表循环中抽离，便于用定向测试锁定编辑态与预览态的数据一致性，
 * 同时避免以后在模板或其它画布分支再次复制“原始配置 / 运行时配置”的选择条件。
 */
export const resolveWidgetRenderOption = (component: BaseWidgetConfig, preview: boolean) => {
  /**
   * 图表保存数据配置后，持久化 option 会主动移除 dataset、series.data 等真实数据，
   * 因此编辑态也必须临时合并 dataConfig；否则图表重挂载后只能拿到空的样式模板。
   * 非图表部件保存时已经把运行时值同步进 option，不在编辑态重复构建，避免无谓深拷贝。
   */
  const shouldBuildRuntimeOption =
    preview || (component.info.packageName === 'Chart' && Boolean(component.dataConfig))

  return shouldBuildRuntimeOption ? buildWidgetRuntimeOption(component) : component.option
}

interface WidgetRenderOptionCacheEntry {
  component: BaseWidgetConfig
  preview: boolean
  version: number
  option: unknown
}

/**
 * 创建画布运行时配置的按部件增量缓存。
 *
 * 渲染版本表采用不可变更新，因此任一部件刷新都会让画布计算状态重新执行。缓存同时核对部件实例、
 * 预览状态和该部件自己的版本号，使未变化部件直接复用已构建结果，避免再次深拷贝完整图表数据。
 * `retain()` 会在部件删除后同步清理缓存，防止编辑大量临时部件时积累无效引用。
 */
export const createWidgetRenderOptionCache = () => {
  const entries = new Map<string, WidgetRenderOptionCacheEntry>()

  const resolve = (
    widgetId: string,
    component: BaseWidgetConfig,
    preview: boolean,
    version: number,
  ) => {
    const cached = entries.get(widgetId)
    if (
      cached &&
      cached.component === component &&
      cached.preview === preview &&
      cached.version === version
    ) {
      return cached.option
    }

    const option = resolveWidgetRenderOption(component, preview)
    entries.set(widgetId, { component, preview, version, option })
    return option
  }

  const retain = (activeWidgetIds: ReadonlySet<string>) => {
    entries.forEach((_, widgetId) => {
      if (!activeWidgetIds.has(widgetId)) {
        entries.delete(widgetId)
      }
    })
  }

  return { resolve, retain }
}
