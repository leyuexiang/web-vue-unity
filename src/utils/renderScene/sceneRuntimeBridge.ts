import type * as THREE from '@/types/legacyObjectPort'
import { useSceneDataStore, useSceneRequestStore, useSceneStore } from '@/stores/sceneEditStore'
import type renderScene from './index'
import type { Dataset } from '@/types/threeScene'
import type { PublicRequestConfig, RequestGlobalConfig } from '@/types/data-config'

/**
 * 渲染运行时桥接接口。
 *
 * renderScene 子模块通过这层读取场景实例、数据集、请求和任务事件，
 * 不再在每个模块里直接 import Pinia Store。这样 Store 与渲染层的耦合集中在
 * 单个适配入口，后续要替换状态来源或补测试替身时只需要改这里。
 *
 * 二维画布部件已迁出到 integrations/scene/widgetRuntime 与 widgetPanels，
 * 本桥不再暴露二维仓库、部件列表或运行时值表。
 */
export interface SceneRuntimeBridge {
  readonly sceneApi: renderScene | null
  readonly scene: THREE.Scene | null
  readonly datasets: Dataset[]
  readonly publicRequests: PublicRequestConfig[]
  readonly requestGlobalConfig: RequestGlobalConfig
  readonly isMeasuring: boolean
  setSceneIsPublish: (isPublish: boolean) => void
  markSceneContentsDirty: () => void
  setCurrentTransformMaterialUuid: (uuid: string | null) => void
  setIsMeasuring: (isMeasuring: boolean) => void
  setSceneDataset: (dataset: Dataset[]) => void
  setScenePublicRequestList: (list: PublicRequestConfig[]) => void
  setSceneRequestGlobalConfig: (config: RequestGlobalConfig) => void
}

/**
 * 获取渲染运行时桥接对象。
 *
 * 这里每次通过 getter 读取 Pinia 当前值，避免在模块加载时缓存旧 Store 快照。
 * 子模块可以安全在文件顶层保存该对象，真正访问时仍会拿到最新场景状态。
 */
export const getSceneRuntimeBridge = (): SceneRuntimeBridge => ({
  get sceneApi() {
    return useSceneStore().sceneApi
  },
  get scene() {
    return useSceneStore().sceneApi?.scene ?? null
  },
  get datasets() {
    return useSceneDataStore().sceneDataset || []
  },
  get publicRequests() {
    return useSceneRequestStore().scenePublicRequestList || []
  },
  get requestGlobalConfig() {
    return useSceneRequestStore().sceneRequestGlobalConfig
  },
  get isMeasuring() {
    return useSceneStore().isMeasuring
  },
  setSceneIsPublish(isPublish) {
    useSceneStore().setSceneIsPublish(isPublish)
  },
  markSceneContentsDirty() {
    useSceneStore().setTransformMaterialRandomId()
  },
  setCurrentTransformMaterialUuid(uuid) {
    useSceneStore().setCurrentTransformMaterialUuid(uuid)
  },
  setIsMeasuring(isMeasuring) {
    useSceneStore().setIsMeasuring(isMeasuring)
  },
  setSceneDataset(dataset) {
    useSceneDataStore().setSceneDataset(dataset)
  },
  setScenePublicRequestList(list) {
    useSceneRequestStore().setScenePublicRequestList(list)
  },
  setSceneRequestGlobalConfig(config) {
    useSceneRequestStore().setSceneRequestGlobalConfig(config)
  },
})
