import { getActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import type { SceneAllContentsItem, SceneAsyncConfig } from '@/types/threeScene'
import { readWidgetSceneFragment } from '@/integrations/scene/widgetRuntime/widgetSceneFragment'
import { useSceneStore } from '@/stores/sceneEditStore'
import { appLogger } from '@/utils/logger'

/** 结构面板只读取领域快照，不遍历或创建引擎对象；保留稳定编号供事件配置。 */
export const getSceneAllContents = (): SceneAllContentsItem[] =>
  (getActiveSceneViewportHost()?.getStore().getObjects() ?? []).map(object => ({
    uuid: object.id, onlyUuid: object.id, name: object.name, type: object.type,
    visible: object.visible, userData: { ...object.metadata, sceneObjectId: object.id },
  } as SceneAllContentsItem))
const unavailable = () => { appLogger.warn('SceneModules', '三维操作待 Unity 渲染接入'); return false }
export const focusSceneContentByUuid = (_id: string) => unavailable()
export const removeSceneContentByUuid = (_id: string) => unavailable()
export const toggleSceneContentPickupByUuid = (_id: string) => unavailable()
export const toggleSceneContentVisibleByUuid = (_id: string) => unavailable()
export const selectSceneContentByUuid = (id: string) => {
  const store = getActiveSceneViewportHost()?.getStore()
  if (!store?.getObject(id)) return false
  store.setSelectedObjectId(id)
  useSceneStore().setCurrentTransformMaterialUuid(id)
  return true
}
/** 历史文件识别入口只读取二维片段，正式保存仍使用完整四包。 */
export const useGetSceneAsyncConfig = async () => ({ ...readWidgetSceneFragment() }) as SceneAsyncConfig

/** 三维规则只从完整领域快照读取，二维阶段不接受三维规则写入。 */
export const getInteractiveEventConfig = (id: string | null) => getActiveSceneViewportHost()?.getStore().getObject(id ?? '')?.metadata?.interactiveEvent as import('@/types/threeScene').InteractionEvent[] ?? []
export const getStatusListConfig = (id: string | null) => getActiveSceneViewportHost()?.getStore().getObject(id ?? '')?.metadata?.statusList as import('@/types/threeScene').InteractionEvent[] ?? []
export const updateInteractiveEventConfig = (_id: string | null, _events: unknown[]) => unavailable()
export const updateStatusListConfig = (_id: string | null, _events: unknown[]) => unavailable()
