import type * as THREE from '@/types/legacyObjectPort'
import type { ScenePanelConfig } from '@/scene-platform/core/scenePanelConfig'
import type { SceneAsyncConfig } from '@/types/threeScene'

/**
 * 旧渲染器的静态兼容契约，迁移页不构造此类型的实例，sceneApi 在二维阶段始终为空。
 * 历史面板经显式端口读取领域数据，此文件不提供图形执行器或隐式三维降级。
 */
export default interface LegacyScenePort {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  getSceneObjectByUuid: (id: string) => THREE.Object3D | null
  getScenePanelState: () => ScenePanelConfig
  onWindowResizes: () => void
  setObjectHighlight: (object: THREE.Object3D) => void
  transformControlsModules: {
    clearCurrentSelection: () => void
    setIsPreviewScene: (value: boolean) => void
    clearSelectionWhenClickBlank: (event: MouseEvent) => boolean
    setTransformType: (mode: string) => void
    setTransformControlsMode: (mode: string) => string
    transformControls: { mode: string; object?: THREE.Object3D | null }
  }
  scenePreviewModules: {
    isPreview: boolean
    setDataPollingManagedExternally: (enabled: boolean) => void
    exitScenePreview: () => void
    setScenePreview: () => Promise<void>
    closeScenePreview: () => void
    cancelScenePreview: () => void
    clearScenePreview: () => void
  }
  statusEventModules: {
    executeAllStatusEvents: (port?: unknown) => void
    scheduleExecuteAllStatusEvents: (port?: unknown) => void
  }
  measureDistanceModules: { stopMeasure: () => void; startMeasure: (type: string) => void }
  sceneModules: { useGetSceneAsyncConfig: () => Promise<SceneAsyncConfig> }
}

/** 独立预览只读桥：类型兼容，禁止回写编辑页的选择与历史。 */
export interface RenderSceneStoreBridge {
  getIsMeasuring: () => boolean
  setCurrentTransformMaterialUuid: (id: string | null) => void
  setTransformMaterialRandomId: () => void
}
