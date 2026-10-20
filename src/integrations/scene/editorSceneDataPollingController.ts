import { watch, type WatchStopHandle } from 'vue'
import { useSceneDataStore, useSceneRequestStore } from '@/stores/sceneAuxiliaryStores'
import { useSceneWidgetStore, type WidgetConfig } from '@/stores/sceneEditStore'
import type { ComponentDataConfig } from '@/types/data-config'
import type { SceneObject, ViewportHost } from '@/scene-platform'
import type renderScene from '@/utils/renderScene'
import { getDataConfigRequests } from '@/utils/dataConfig'
import { appLogger } from '@/utils/logger'
import { SceneDataPollingRuntime } from './widgetRuntime'

export interface EditorSceneDataPollingController {
  /** 启动编辑场景的数据任务；重复调用只会在配置确实变化时重建调度。 */
  start: () => Promise<void>
  /** 释放监听、延迟任务和全部轮询定时器。 */
  dispose: () => void
}

export interface EditorSceneDataPollingControllerOptions {
  getViewportHost: () => ViewportHost | null
  getLegacySceneApi?: () => renderScene | null
  /** 测试可缩短防抖窗口；生产默认合并同一轮表单和 Store 更新。 */
  refreshDelayMs?: number
}

/**
 * 只提取会改变请求任务或结果映射的配置字段。
 *
 * 远程请求返回后会更新 `dataset.source/dimensions`。这些运行时结果不能进入监听签名，否则每次
 * 轮询回填都会反向触发调度器重启，造成重复首轮请求。静态数据的权威输入位于
 * `request.config.data`，数据集的权威引用也位于 `request.config`，所以所有类型都无需把结果镜像
 * `dataset` 纳入签名。
 */
const projectDataConfigForPollingSignature = (
  dataConfig: ComponentDataConfig | null | undefined,
) => {
  if (!dataConfig) return null
  return {
    version: dataConfig.version,
    requests: getDataConfigRequests(dataConfig).map((item) => ({
      id: item.id,
      request: item.request,
      extractor: item.extractor,
      bindings: item.bindings,
      filterFn: item.filterFn,
      deletedAutoMappingTargets: item.deletedAutoMappingTargets,
    })),
  }
}

const projectWidgetForPollingSignature = (widget: WidgetConfig) => ({
  id: widget.id,
  dataConfig: projectDataConfigForPollingSignature(widget.component.dataConfig),
  // 分页适配属于请求配置，外观不参与签名；更换参数、响应路径或每页数量才重新初始化。
  recordPagination:
    widget.component.info.keyName === 'VRecordPagination'
      ? (widget.component.option as { pagination?: unknown }).pagination
      : undefined,
})

const projectObjectForPollingSignature = (object: SceneObject) => ({
  id: object.id,
  dataConfig: projectDataConfigForPollingSignature(
    object.metadata?.dataConfig as ComponentDataConfig | undefined,
  ),
})

/**
 * 生成稳定签名时按实例编号排序，二维层级调整和三维对象排序不会误触发网络任务重建。
 * 所有输入都是场景可序列化数据，不包含引擎对象，因此可以安全使用 JSON 序列化比较。
 */
const createPollingSignature = (
  widgets: readonly WidgetConfig[],
  objects: readonly SceneObject[],
  publicRequests: unknown,
  requestGlobalConfig: unknown,
) =>
  JSON.stringify({
    widgets: [...widgets]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(projectWidgetForPollingSignature),
    objects: [...objects]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(projectObjectForPollingSignature),
    publicRequests,
    requestGlobalConfig,
  })

/**
 * 创建编辑场景级数据请求控制器。
 *
 * 当前二维阶段统一编排组件请求，不执行保全的三维配置，也不接管配置持久化：
 * - 二维结果继续由部件运行服务增量刷新当前组件；
 * - 保留三维结果写入端口供后续适配，本阶段不登记任何三维任务；
 * - 公共接口定义和全局配置仍由 sceneJson 对应的请求仓库管理；
 * - 实例请求绑定仍来自各实例依赖，不在这里复制数据。
 */
export const createEditorSceneDataPollingController = (
  options: EditorSceneDataPollingControllerOptions,
): EditorSceneDataPollingController => {
  const widgetStore = useSceneWidgetStore()
  const dataStore = useSceneDataStore()
  const requestStore = useSceneRequestStore()
  const refreshDelayMs = Math.max(0, options.refreshDelayMs ?? 100)
  const watchStops: WatchStopHandle[] = []
  let stopSceneStoreSubscription: (() => void) | null = null
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let lastSignature = ''
  let started = false
  let disposed = false

  const pollingRuntime = new SceneDataPollingRuntime({
    getDatasets: () => dataStore.sceneDataset,
    getPublicRequests: () => requestStore.scenePublicRequestList,
    getRequestGlobalConfig: () => requestStore.sceneRequestGlobalConfig,
    getRuntimeContext: () => ({
      sceneId: options.getViewportHost()?.getStore().getScene().id,
    }),
    // 二维阶段只调度部件，三维配置只保全不执行。
    getSceneObjects: () => [],
    applySceneObject: async (object) => {
      /**
       * 数据结果属于运行时状态，直接交给当前引擎中立 Runtime。GIS 与本地三维在各自适配器中
       * 应用经纬高或本地变换；绝不调用 SceneStore.upsertObject，避免轮询数据进入保存和撤销栈。
       */
      await options.getViewportHost()?.getRuntime().upsertObject(object)
    },
  })

  const readSignature = () => {
    // 保留响应式代理，签名读取才能追踪面板内原位修改的配置；结果数据已由投影排除。
    return createPollingSignature(
      widgetStore.totalWidgets ?? [],
      [],
      requestStore.scenePublicRequestList,
      requestStore.sceneRequestGlobalConfig,
    )
  }

  const refresh = async (force = false) => {
    if (disposed || !options.getViewportHost()) return
    const signature = readSignature()
    if (!force && signature === lastSignature) return
    lastSignature = signature
    await pollingRuntime.start()
  }

  const scheduleRefresh = () => {
    if (disposed) return
    if (refreshTimer !== null) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void refresh().catch((error) => {
        appLogger.error('EditorSceneDataPollingController', '刷新场景数据请求任务失败', error)
      })
    }, refreshDelayMs)
  }

  const start = async () => {
    if (disposed) return
    /** 旧预览模块继续负责历史数据集和交互事件，但不再创建二维或三维远程请求定时器。 */
    options.getLegacySceneApi?.()?.scenePreviewModules.setDataPollingManagedExternally(true)

    const isFirstStart = !started
    if (isFirstStart) {
      started = true
      watchStops.push(
        watch(
          readSignature,
          scheduleRefresh,
        ),
      )
      const sceneStore = options.getViewportHost()?.getStore()
      stopSceneStoreSubscription =
        sceneStore?.subscribe((event) => {
          /** 仅实例集合或其数据配置可能变化的事件需要复核签名，选择和变换等结果会被签名过滤。 */
          if (['sceneLoaded', 'objectUpserted', 'objectRemoved'].includes(event.type)) {
            scheduleRefresh()
          }
        }) ?? null
    }

    await refresh(isFirstStart)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (refreshTimer !== null) clearTimeout(refreshTimer)
    refreshTimer = null
    watchStops.splice(0).forEach((stop) => stop())
    stopSceneStoreSubscription?.()
    stopSceneStoreSubscription = null
    pollingRuntime.dispose()
  }

  return { start, dispose }
}
