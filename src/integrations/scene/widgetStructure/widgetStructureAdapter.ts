import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import type { SceneWidgetTargetItem } from '@/types/threeScene'
import {
  getWidgetDisplayName,
  getWidgetKindLabelByPackage,
  getWidgetTargetOptions,
} from '@/integrations/scene/widgetPanels'

/**
 * 二维结构树适配层。
 *
 * 结构面板只通过这里读取和修改二维部件，避免再从三维 sceneStructureBridge
 * 获取部件候选、类型文案或显隐能力。
 */
export interface WidgetStructureAdapter {
  getTargets: () => SceneWidgetTargetItem[]
  updateVisibleById: (id: string, visible: boolean) => boolean
}

export { getWidgetDisplayName, getWidgetKindLabelByPackage, getWidgetTargetOptions }

export const updateWidgetVisibleById = (id: string, visible: boolean) => {
  const widgetStore = useSceneWidgetStore()
  const target = widgetStore.getWidgetById(id)
  if (!target) return false

  widgetStore.runWidgetHistoryChange('更新部件显隐', [id], () => {
    /** 结构树与右侧基础面板共用仓库入口，所有二维包类型遵循同一缓存失效规则。 */
    widgetStore.setWidgetVisible(id, visible)
  })
  return true
}

export const createCurrentProjectWidgetStructureAdapter = (): WidgetStructureAdapter => ({
  getTargets: getWidgetTargetOptions,
  updateVisibleById: updateWidgetVisibleById,
})
