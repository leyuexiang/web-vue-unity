import { cloneDeep } from 'lodash-es'
import { useSceneWidgetStore, type WidgetConfig } from '@/stores/sceneEditStore'
import type { WidgetCanvasConfig, WidgetLayerNode } from '@/types/threeScene'

/**
 * 二维画布保存恢复片段。
 *
 * 字段名保持后端现有协议不变，只把读取和应用入口收敛到当前项目适配层。
 */
export interface WidgetSceneFragment {
  widgets: WidgetConfig[]
  widgetLayerTree: WidgetLayerNode[]
  widgetCanvas?: WidgetCanvasConfig
}

/**
 * 读取当前二维画布片段。
 * 保存侧只消费这份片段，避免 sceneModules 直接认识二维仓库内部字段。
 */
export const readWidgetSceneFragment = (): WidgetSceneFragment => {
  const widgetStore = useSceneWidgetStore()

  return {
    widgets: cloneDeep(widgetStore.totalWidgets || []),
    widgetLayerTree: cloneDeep(widgetStore.widgetLayerTree || []),
    widgetCanvas: widgetStore.getWidgetCanvasConfig(),
  }
}

/**
 * 应用二维画布片段。
 * 加载空部件列表时也会覆盖当前仓库，避免从上一张场景残留二维部件。
 */
export const applyWidgetSceneFragment = async (
  fragment: Partial<WidgetSceneFragment> | null | undefined,
) => {
  const widgetStore = useSceneWidgetStore()

  widgetStore.setWidgetCanvasSizeFromConfig(fragment?.widgetCanvas)
  await widgetStore.loadSavedWidgets(fragment?.widgets || [], fragment?.widgetLayerTree || null)
}

/**
 * 追加发布预览中首次被显示的二维组件。
 * 完整分片仍只保留在页面内存，调用时只安装目标组件；画布尺寸不重复写入，避免单个组件激活
 * 触发整张舞台重新计算。完整结构树由预览加载器传入，仓库会自动裁剪到当前已激活组件集合。
 */
export const appendWidgetSceneFragment = async (
  fragment: Partial<WidgetSceneFragment> | null | undefined,
) => {
  if (!fragment?.widgets?.length) return
  const widgetStore = useSceneWidgetStore()
  await widgetStore.appendSavedWidgets(fragment.widgets, fragment.widgetLayerTree || null)
}
