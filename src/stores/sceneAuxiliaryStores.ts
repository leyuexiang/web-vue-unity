import { defineStore } from 'pinia'
import { ref, toRaw, type Ref } from 'vue'
import { cloneDeep } from 'lodash-es'
import type { Dataset } from '@/types/threeScene'
import type { PublicRequestConfig, RequestGlobalConfig } from '@/types/data-config'
import { createEmptyRequestGlobalConfig } from '@/types/data-config'
import { normalizePublicRequestName } from '@/utils/dataConfig/publicRequestName'

type SceneDatasetType = {
  sceneDataset: Ref<Dataset[]>
  setSceneDataset: (dataset: Dataset[]) => void
}

export const useSceneDataStore = defineStore('sceneDataStore', (): SceneDatasetType => {
  const sceneDataset = ref<Dataset[]>([])

  const setSceneDataset = (dataset: Dataset[]) => {
    sceneDataset.value = dataset
  }

  return {
    sceneDataset,
    setSceneDataset,
  }
})

type SceneRequestStoreType = {
  scenePublicRequestList: Ref<PublicRequestConfig[]>
  setScenePublicRequestList: (list: PublicRequestConfig[]) => void
  sceneRequestGlobalConfig: Ref<RequestGlobalConfig>
  setSceneRequestGlobalConfig: (config: RequestGlobalConfig) => void
  /** 没有实例拥有者的场景级动作，不与实例 behaviors 共用状态。 */
  sceneActions: Ref<unknown[]>
  setSceneActions: (actions: unknown[]) => void
}

export const useSceneRequestStore = defineStore('sceneRequestStore', (): SceneRequestStoreType => {
  const scenePublicRequestList = ref<PublicRequestConfig[]>([])
  const sceneRequestGlobalConfig = ref<RequestGlobalConfig>(createEmptyRequestGlobalConfig())
  const sceneActions = ref<unknown[]>([])

  /** Pinia 输入可能含嵌套 Vue 代理，先解包再深复制，避免状态与调用方共享可变引用。 */
  const cloneStoreValue = <T>(value: T): T => cloneDeep(toRaw(value))

  const setScenePublicRequestList = (list: PublicRequestConfig[]) => {
    /**
     * 公共接口列表是加载旧场景、弹窗保存和运行时读取的唯一写入边界。
     * 在这里一次性兼容旧 `requestName` 字段，避免下拉选项、当前选中值和保存快照
     * 分别采用不同字段导致名称丢失；仅线性遍历一次列表，不影响接口请求性能。
     */
    scenePublicRequestList.value = list.map((item) =>
      normalizePublicRequestName(cloneStoreValue(item)),
    )
  }

  const setSceneRequestGlobalConfig = (config: RequestGlobalConfig) => {
    sceneRequestGlobalConfig.value = cloneStoreValue(config)
  }

  const setSceneActions = (actions: unknown[]) => {
    /**
     * 场景动作只描述场景级触发及其目标引用，保存和加载时必须与实例行为分开。
     * 深复制可以切断属性面板响应式对象与场景快照之间的引用，避免保存过程中被继续编辑污染。
     */
    sceneActions.value = cloneStoreValue(actions)
  }

  return {
    scenePublicRequestList,
    setScenePublicRequestList,
    sceneRequestGlobalConfig,
    setSceneRequestGlobalConfig,
    sceneActions,
    setSceneActions,
  }
})
