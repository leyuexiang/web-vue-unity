import type { SceneObject, ViewportHost } from '@/scene-platform'
import type { SceneObjectInteractionEvent } from '@/scene-platform/runtime/sceneRuntime'
import type { ConditionBlokList, InteractionEvent } from '@/types/threeScene'
import type { ComponentDataConfig } from '@/types/data-config'
import { evaluateConditionBlock } from '@/utils/renderScene/conditionRuntime'
import {
  createInteractionLifecycleGuard,
  isActionPending,
  runInteractionSequence,
} from '@/utils/renderScene/interactionActionSequence'
import { appLogger } from '@/utils/logger'
import { createEditorSceneInteractionActionRuntimePort } from './editorSceneInteractionActionRuntime'
import {
  getEditorSceneObjectInteractiveEventList,
  getEditorSceneObjectStatusList,
} from './editorSceneInteractionConfigAdapter'

export interface EditorSceneObjectBehaviorRuntime {
  /** 预览切换前先接受引擎已切换模式后到达的首个点击通知。 */
  preparePreview: () => void
  /** 预览模式确认后，评估一次已有三维状态规则。 */
  startPreview: () => Promise<void>
  /** 数据刷新写回 Runtime 前叠加预览显隐，避免请求结果覆盖交互动作的临时状态。 */
  applyPreviewOverridesToSceneObject: (object: SceneObject) => SceneObject
  /** 数据轮询回写模型后，仅重评该对象的状态规则。 */
  observeSceneObject: (object: SceneObject) => Promise<void>
  /** 退出预览时取消后续动作并清空状态边沿缓存。 */
  exitPreview: () => void
  /** 释放运行时订阅、会话快照和在途动作。 */
  dispose: () => void
}

export interface EditorSceneObjectBehaviorRuntimeOptions {
  getViewportHost: () => ViewportHost | null
}

interface PendingStatusEvaluation {
  latestObject: SceneObject
  rerun: boolean
  sceneGeneration: number
  objectGeneration: number
  promise: Promise<void>
}

const getConditionBlocks = (event: InteractionEvent): ConditionBlokList[] =>
  (event.conditionGroupList ?? []).flatMap((group) => group.conditionBlokList ?? [])

/**
 * 三维草稿对象的状态与点击事件运行服务。
 * 配置仍由 SceneObject 元数据持有；服务只保留本编辑会话的实时数据快照和规则边沿，不写入历史或保存数据。
 */
export const createEditorSceneObjectBehaviorRuntime = (
  options: EditorSceneObjectBehaviorRuntimeOptions,
): EditorSceneObjectBehaviorRuntime => {
  const host = options.getViewportHost()
  const store = host?.getStore() ?? null
  let disposed = false
  let previewActive = false
  let previewEntering = false
  let sceneGeneration = 0
  const objectGenerationById = new Map<string, number>()
  const runtimeObjects = new Map<string, SceneObject>()
  /** 预览显隐只写引擎；离开预览时按进入前的实时状态恢复，不改领域对象或命令历史。 */
  const previewVisibilitySnapshot = new Map<string, boolean>()
  /** 保存已由交互动作确认的预览显隐，供条件求值和后续数据回写共同读取。 */
  const previewVisibilityOverrides = new Map<string, boolean>()
  const previousStatusMatches = new Map<string, Map<string, boolean>>()
  const pendingStatusByObject = new Map<string, PendingStatusEvaluation>()
  const stopRuntimeInteraction = host?.getRuntime().subscribeObjectInteraction?.((event) => {
    if (disposed || (!previewActive && !previewEntering)) return
    void handleObjectInteraction(event.objectId, event.eventType)
  })
  const stopStoreSubscription = store?.subscribe((event) => {
    if (event.type === 'sceneLoaded') {
      sceneGeneration += 1
      runtimeObjects.clear()
      previousStatusMatches.clear()
      pendingStatusByObject.clear()
      objectGenerationById.clear()
      previewVisibilitySnapshot.clear()
      previewVisibilityOverrides.clear()
    } else if (event.type === 'objectRemoved') {
      objectGenerationById.set(event.objectId, (objectGenerationById.get(event.objectId) ?? 0) + 1)
      runtimeObjects.delete(event.objectId)
      previousStatusMatches.delete(event.objectId)
      pendingStatusByObject.delete(event.objectId)
      previewVisibilitySnapshot.delete(event.objectId)
      previewVisibilityOverrides.delete(event.objectId)
    }
  })

  const isObjectActive = (
    objectId: string,
    targetSceneGeneration = sceneGeneration,
    targetObjectGeneration = objectGenerationById.get(objectId) ?? 0,
  ) =>
    !disposed &&
    (previewActive || previewEntering) &&
    targetSceneGeneration === sceneGeneration &&
    targetObjectGeneration === (objectGenerationById.get(objectId) ?? 0) &&
    options.getViewportHost() === host &&
    Boolean(store?.getObject(objectId))

  /** 规则读 Store 最新配置，并把轮询器保留的数据集结果合并到当前领域对象快照。 */
  const getCurrentRuntimeObject = (objectId: string, fallback?: SceneObject) => {
    const current = store?.getObject(objectId) ?? fallback ?? null
    if (!current) return null
    const runtimeObject = runtimeObjects.get(objectId)
    const hasVisibilityOverride = previewVisibilityOverrides.has(objectId)
    if (!runtimeObject && !hasVisibilityOverride) return current
    const runtimeDataConfig = runtimeObject?.metadata?.dataConfig
    return {
      ...current,
      ...(runtimeObject ? { visible: runtimeObject.visible, transform: runtimeObject.transform } : {}),
      ...(hasVisibilityOverride ? { visible: previewVisibilityOverrides.get(objectId)! } : {}),
      metadata: {
        ...(current.metadata ?? {}),
        ...(runtimeDataConfig ? { dataConfig: runtimeDataConfig } : {}),
      },
    }
  }

  const capturePreviewVisibility = (objectId: string, fallback?: SceneObject) => {
    if (previewVisibilitySnapshot.has(objectId)) return
    const object = store?.getObject(objectId) ?? fallback
    if (!object) return
    const visible = previewVisibilityOverrides.has(objectId)
      ? previewVisibilityOverrides.get(objectId)!
      : runtimeObjects.get(objectId)?.visible ?? object.visible
    previewVisibilitySnapshot.set(objectId, visible)
  }

  /** 三维规则复用二维动作执行器；引擎专属高亮和相机动作由三维 Runtime 原生处理。 */
  const executeSupportedActions = (
    objectId: string,
    object: SceneObject,
    actionList: ConditionBlokList['actionList'],
    targetSceneGeneration = sceneGeneration,
    targetObjectGeneration = objectGenerationById.get(objectId) ?? 0,
  ) => {
    if (!actionList?.length || !store || !host) return
    const actions = actionList ?? []
    if (!actions.length) return
    actions.forEach((action) => {
      if (typeof action.actionTargetUuid === 'string') {
        capturePreviewVisibility(action.actionTargetUuid)
      }
    })

    const actionRuntime = createEditorSceneInteractionActionRuntimePort({
      getRuntime: () => options.getViewportHost()?.getRuntime() ?? null,
      isActive: () => isObjectActive(objectId, targetSceneGeneration, targetObjectGeneration),
    })
    const result = actionRuntime.executeActionList(actions, {
      sourceDataConfig: object.metadata?.dataConfig as ComponentDataConfig | null | undefined,
      onSceneObjectVisibilityChanged: (targetObjectId, visible) => {
        if (!previewActive && !previewEntering) return
        const targetObject = getCurrentRuntimeObject(targetObjectId)
        if (!targetObject) return
        previewVisibilityOverrides.set(targetObjectId, visible)
        runtimeObjects.set(targetObjectId, { ...targetObject, visible })
      },
    })
    if (isActionPending(result)) {
      return result.finally(() => actionRuntime.dispose?.())
    }
    actionRuntime.dispose?.()
    return result
  }

  const evaluateBlock = (
    objectId: string,
    object: SceneObject,
    block: ConditionBlokList,
    targetSceneGeneration = sceneGeneration,
    targetObjectGeneration = objectGenerationById.get(objectId) ?? 0,
  ) => {
    if (!store || !evaluateConditionBlock(block, { kind: 'sceneObject', sceneObject: object, store })) return
    return executeSupportedActions(
      objectId,
      object,
      block.actionList,
      targetSceneGeneration,
      targetObjectGeneration,
    )
  }

  /** 只运行与引擎回传触发类型一致的已启用事件，编辑模式选择仍与业务事件隔离。 */
  const handleObjectInteraction = async (
    objectId: string,
    eventType: SceneObjectInteractionEvent['eventType'],
  ) => {
    const targetSceneGeneration = sceneGeneration
    const targetObjectGeneration = objectGenerationById.get(objectId) ?? 0
    const source = getCurrentRuntimeObject(objectId)
    if (!source || !store || !isObjectActive(objectId, targetSceneGeneration, targetObjectGeneration)) return
    const events = getEditorSceneObjectInteractiveEventList({ store, objectId, legacyEventList: [] })
      .filter((event) => event.isOpen && event.eventType === eventType)
    const isActive = createInteractionLifecycleGuard(() =>
      isObjectActive(objectId, targetSceneGeneration, targetObjectGeneration),
    )
    try {
      await runInteractionSequence(events, (event) => {
        return runInteractionSequence(getConditionBlocks(event), (block) => {
          const current = getCurrentRuntimeObject(objectId, source)
          if (!current) return
          return evaluateBlock(objectId, current, block, targetSceneGeneration, targetObjectGeneration)
        }, isActive)
      }, isActive)
    } catch (error) {
      appLogger.error('EditorSceneObjectBehaviorRuntime', `执行三维${eventType}事件失败`, error)
    }
  }

  /**
   * 只在状态条件从不满足变为满足时执行动作，避免轮询周期内反复提交同一显隐命令。
   * 单对象在途时只保留最后一份数据快照，响应完成后最多补做一次最新评估。
   */
  const evaluateObjectStatuses = async (
    object: SceneObject,
    targetSceneGeneration: number,
    targetObjectGeneration: number,
  ) => {
    if (!store || !previewActive || !isObjectActive(object.id, targetSceneGeneration, targetObjectGeneration)) return
    const current = getCurrentRuntimeObject(object.id, object)
    if (!current) return
    const statusList = getEditorSceneObjectStatusList({ store, objectId: object.id, legacyEventList: [] })
    const previous = previousStatusMatches.get(object.id) ?? new Map<string, boolean>()
    const next = new Map<string, boolean>()
    const triggeredBlocks: ConditionBlokList[] = []

    statusList.filter((status) => status.isOpen).forEach((status) => {
      getConditionBlocks(status).forEach((block) => {
        const key = status.id + ':' + block.id
        const matched = Boolean(evaluateConditionBlock(block, { kind: 'sceneObject', sceneObject: current, store }))
        next.set(key, matched)
        if (matched && previous.get(key) !== true) triggeredBlocks.push(block)
      })
    })
    previousStatusMatches.set(object.id, next)

    const isActive = createInteractionLifecycleGuard(
      () => previewActive && isObjectActive(object.id, targetSceneGeneration, targetObjectGeneration),
    )
    await runInteractionSequence(
      triggeredBlocks,
      (block) => evaluateBlock(object.id, current, block, targetSceneGeneration, targetObjectGeneration),
      isActive,
    )
  }

  const evaluateSceneObjectStatus = (object: SceneObject): Promise<void> => {
    if (disposed || !previewActive) return Promise.resolve()
    const pending = pendingStatusByObject.get(object.id)
    if (pending) {
      pending.latestObject = object
      pending.rerun = true
      return pending.promise
    }

    const entry: PendingStatusEvaluation = {
      latestObject: object,
      rerun: false,
      sceneGeneration,
      objectGeneration: objectGenerationById.get(object.id) ?? 0,
      promise: Promise.resolve(),
    }
    entry.promise = (async () => {
      do {
        entry.rerun = false
        await evaluateObjectStatuses(entry.latestObject, entry.sceneGeneration, entry.objectGeneration)
      } while (
        entry.rerun &&
        previewActive &&
        !disposed &&
        entry.sceneGeneration === sceneGeneration &&
        entry.objectGeneration === (objectGenerationById.get(object.id) ?? 0)
      )
    })().catch((error) => {
      appLogger.error('EditorSceneObjectBehaviorRuntime', '评估三维状态规则失败', error)
    }).finally(() => {
      if (pendingStatusByObject.get(object.id) === entry) pendingStatusByObject.delete(object.id)
    })
    pendingStatusByObject.set(object.id, entry)
    return entry.promise
  }

  return {
    preparePreview: () => {
      if (disposed) return
      if (previewActive || previewEntering) return
      // 首次预览交互可能早于引擎确认完成；在此开启新快照，保留其动作前状态供退出时恢复。
      previewVisibilitySnapshot.clear()
      previewVisibilityOverrides.clear()
      previewEntering = true
    },
    startPreview: async () => {
      if (disposed || !store) return
      previewEntering = false
      previewActive = true
      const objects = store.getScene().objects
      // 不清除进入预览阶段已捕获的目标快照，避免首个提前到达的点击改变恢复基线。
      objects.forEach((object) => capturePreviewVisibility(object.id, object))
      const targets = objects.filter((object) =>
        getEditorSceneObjectStatusList({ store, objectId: object.id, legacyEventList: [] })
          .some((status) => status.isOpen),
      )
      for (const object of targets) await evaluateSceneObjectStatus(object)
    },
    applyPreviewOverridesToSceneObject: (object) => {
      if ((!previewActive && !previewEntering) || !previewVisibilityOverrides.has(object.id)) {
        return object
      }
      return { ...object, visible: previewVisibilityOverrides.get(object.id)! }
    },
    observeSceneObject: async (object) => {
      if (disposed) return
      runtimeObjects.set(object.id, object)
      if (previewEntering || previewActive) capturePreviewVisibility(object.id, object)
      await evaluateSceneObjectStatus(object)
    },
    exitPreview: () => {
      previewActive = false
      previewEntering = false
      previousStatusMatches.clear()
      const visibility = [...previewVisibilitySnapshot]
      previewVisibilitySnapshot.clear()
      previewVisibilityOverrides.clear()
      const runtime = host?.getRuntime()
      visibility.forEach(([objectId, visible]) => {
        const sceneObject = store?.getObject(objectId)
        if (!sceneObject || !runtime) return
        const current = runtimeObjects.get(objectId) ?? sceneObject
        runtimeObjects.set(objectId, { ...current, visible })
        const restoration = runtime.setObjectVisibleAsync
          ? runtime.setObjectVisibleAsync(objectId, visible)
          : Promise.resolve(runtime.setObjectVisible(objectId, visible))
        void restoration.then((applied) => {
          if (!applied) throw new Error('当前三维运行时未接管预览显隐恢复')
        }).catch((error) => {
          appLogger.error('EditorSceneObjectBehaviorRuntime', '恢复预览前模型显隐失败', error)
        })
      })
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      previewActive = false
      previewEntering = false
      stopRuntimeInteraction?.()
      stopStoreSubscription?.()
      runtimeObjects.clear()
      previousStatusMatches.clear()
      pendingStatusByObject.clear()
      objectGenerationById.clear()
      previewVisibilitySnapshot.clear()
      previewVisibilityOverrides.clear()
    },
  }
}
