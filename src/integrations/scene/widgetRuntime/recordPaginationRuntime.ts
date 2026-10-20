import { shallowReactive, watch, type WatchStopHandle } from 'vue'
import { useSceneWidgetStore, type WidgetConfig } from '@/stores/sceneEditStore'
import type {
  ComponentDataConfig,
  PublicRequestConfig,
  RequestGlobalConfig,
} from '@/types/data-config'
import { getDataConfigRequests } from '@/types/data-config'
import { executeComponentDataRequest, type DataRequestRuntimeContext } from '@/utils/dataConfig'
import {
  buildRecordPaginationRequest,
  resolveRecordPaginationRequest,
} from '@/utils/dataConfig/recordPaginationRequest'
import {
  applyInteractionRequestParameters,
  type InteractionRequestParameterAssignment,
} from '@/utils/dataConfig/interactionRequestParameters'
import { setRecordPaginationSelection } from '@/utils/dataConfig/recordPaginationSelection'
import type { RecordPaginationOption } from '@/packages/components/Control/RecordPagination/config'
import {
  canMoveRecord,
  validateRecordPaginationPage,
  type RecordPaginationState,
} from '@/packages/components/Control/RecordPagination/model'
import type { RecordPaginationContext } from '@/packages/components/Control/RecordPagination/runtimeContext'
import { INTERACTIVE_EVENT_ENUM } from '@/enums/scenePanelEnum'
import { getWidgetPreviewState, getWidgetRuntimePort } from './ports'

interface RecordPaginationController {
  /** 提供当前引用配置与重载入口，供公共接口刷新按订阅编号统一调度。 */
  getDataConfig: () => ComponentDataConfig | undefined
  getPublicRequestId: () => string | undefined
  refreshPublicRequest: () => Promise<void>
  state: RecordPaginationState
  move: (direction: -1 | 1) => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  passParameters: (assignments: InteractionRequestParameterAssignment[]) => Promise<void>
  /** 场景历史或懒加载可能替换配置引用；语义未变时只更新引用，保留当前记录和在途请求。 */
  updateWidget: (widget: WidgetConfig) => void
  /** 隐藏组件激活完成前需等待首轮列表，避免后续配置动作被初始化覆盖。 */
  whenReady: () => Promise<void>
}
/** 映射表按实例编号直达；页面重新挂载只重新读取状态，不重复初始化或发送详情请求。 */
const controllers = shallowReactive(new Map<string, RecordPaginationController>())
export const recordPaginationContext: RecordPaginationContext = {
  getState: (id) => controllers.get(id)?.state,
  move: async (id, direction) => {
    await controllers.get(id)?.move(direction)
  },
  retry: async (id) => {
    await controllers.get(id)?.retry()
  },
}

export interface RecordPaginationRuntimeOptions {
  getPublicRequests: () => PublicRequestConfig[]
  /** 可选持久定义用于增量比较；实际请求仍读取当前会话的共享参数。 */
  getPublicRequestDefinitions?: () => PublicRequestConfig[]
  getRequestGlobalConfig: () => RequestGlobalConfig
  getRuntimeContext?: () => DataRequestRuntimeContext
  getWidgets?: () => WidgetConfig[]
  /** 测试可注入已有事件端口的替身，生产始终走当前场景事件服务。 */
  dispatchSelection?: (id: string) => void
}

/**
 * 逐条浏览是按需请求，独立于轮询。调度器负责注册和销毁，进入预览时才加载列表。
 * 状态与参数只存在当前会话；组件配置、共享接口和标准列表首条始终保持原样。
 */
export class RecordPaginationRuntime {
  private readonly owned = new Map<string, RecordPaginationController>()
  /** 只比较持久化请求输入，不把接口返回的行、当前筛选覆盖或视觉样式纳入重建判断。 */
  private readonly signatures = new Map<string, string>()
  private stopPreviewWatch: WatchStopHandle | null = null
  constructor(private readonly options: RecordPaginationRuntimeOptions) {}

  start() {
    const widgets = this.options.getWidgets?.() ?? useSceneWidgetStore().totalWidgets ?? []
    const publicRequests = new Map(
      (this.options.getPublicRequestDefinitions?.() ?? this.options.getPublicRequests()).map(
        (request) => [request.id, request],
      ),
    )
    // 全局配置与场景上下文每次协调只序列化一次，不为每个翻页组件重复处理共享配置。
    const sharedSignature = JSON.stringify({
      global: this.options.getRequestGlobalConfig(),
      context: this.options.getRuntimeContext?.(),
    })
    const retainedIds = new Set<string>()
    const created: RecordPaginationController[] = []
    for (const widget of widgets) {
      if (widget.component.info.keyName !== 'VRecordPagination') continue
      retainedIds.add(widget.id)
      const binding = (widget.component.option as RecordPaginationOption).pagination
      const request = getDataConfigRequests(widget.component.dataConfig).find(
        (item) => item.id === binding.requestId,
      )
      const publicRequestId =
        request?.request.type === 'public'
          ? (request.request.config as { publicRequestId?: string }).publicRequestId
          : undefined
      const signature = JSON.stringify({
        sharedSignature,
        pagination: binding,
        version: widget.component.dataConfig?.version,
        request: request && {
          id: request.id,
          request: request.request,
          extractor: request.extractor,
          filterFn: request.filterFn,
          bindings: request.bindings,
          deletedAutoMappingTargets: request.deletedAutoMappingTargets,
        },
        publicRequest: publicRequestId ? publicRequests.get(publicRequestId) : undefined,
      })
      const existing = this.owned.get(widget.id)
      if (existing && this.signatures.get(widget.id) === signature) {
        existing.updateWidget(widget)
        continue
      }
      // 只有自身请求输入变化才废弃旧响应并回到首条；其他组件新增、请求回填均不会进入此分支。
      existing?.reset()
      const controller = this.createController(widget)
      this.owned.set(widget.id, controller)
      this.signatures.set(widget.id, signature)
      controllers.set(widget.id, controller)
      created.push(controller)
    }
    for (const [id, controller] of this.owned) {
      if (retainedIds.has(id)) continue
      controller.reset()
      if (controllers.get(id) === controller) controllers.delete(id)
      this.owned.delete(id)
      this.signatures.delete(id)
    }
    // 已有会话只初始化本批新增或配置改变的实例，不重复注册预览监听或执行首条事件。
    if (this.stopPreviewWatch) {
      if (getWidgetPreviewState().value) created.forEach((controller) => void controller.retry())
      return
    }
    // 退出预览立即失效在途请求，重新进入从第一页加载；不建立任何定时器。
    this.stopPreviewWatch = watch(
      getWidgetPreviewState(),
      (preview) => {
        for (const controller of this.owned.values()) {
          controller.reset()
          if (preview) void controller.retry()
        }
      },
      { immediate: true, flush: 'sync' },
    )
  }

  /** 只等待指定翻页实例的当前请求，不重新初始化、不额外发送列表。 */
  waitForTargets(widgetIds: readonly string[]): void | Promise<void> {
    const work = widgetIds.flatMap((id) => {
      const controller = this.owned.get(id)
      return controller?.state.loading ? [controller.whenReady()] : []
    })
    if (work.length) return Promise.allSettled(work).then(() => undefined)
  }

  stop() {
    this.stopPreviewWatch?.()
    this.stopPreviewWatch = null
    for (const [id, controller] of this.owned) {
      controller.reset()
      if (controllers.get(id) === controller) controllers.delete(id)
    }
    this.owned.clear()
    this.signatures.clear()
  }

  /** 外部筛选动作仍走已有传参入口；命中浏览器时重置首条，不交给普通轮询器。 */
  async passParameters(widgetId: string, assignments: InteractionRequestParameterAssignment[]) {
    const controller = this.owned.get(widgetId)
    if (!controller) return false
    await controller.passParameters(assignments)
    return true
  }

  /** 按实例读取原引用，公共传参不能落入翻页组件的私有筛选覆盖。 */
  getDataConfig(widgetId: string) {
    return this.owned.get(widgetId)?.getDataConfig()
  }

  /** 公共筛选变化时回到第一页；分页参数仍由各实例生成，不能写回共享接口。 */
  async refreshPublicRequests(requestIds: ReadonlySet<string>): Promise<void> {
    const work: Promise<void>[] = []
    for (const controller of this.owned.values()) {
      const id = controller.getPublicRequestId()
      if (id && requestIds.has(id)) work.push(controller.refreshPublicRequest())
    }
    await Promise.allSettled(work)
  }

  private createController(widget: WidgetConfig): RecordPaginationController {
    const binding = (widget.component.option as RecordPaginationOption).pagination
    const state = shallowReactive<RecordPaginationState>({
      page: binding.firstPage,
      index: 0,
      rows: [],
      total: 0,
      loading: false,
      error: '',
    })
    let version = 0
    let requestOverride: ComponentDataConfig | null = null
    let retryPage = binding.firstPage as number
    let retryDirection: -1 | 1 = 1
    /** 选中记录先提交，再执行已有事件，保证详情请求和事件条件读取的是同一条数据。 */
    const commitSelection = () => {
      const row = state.rows[state.index]
      setRecordPaginationSelection(
        widget.component,
        row ? { requestId: binding.requestId, row } : undefined,
        widget.id,
      )
      if (!row || !getWidgetPreviewState().value) return
      if (this.options.dispatchSelection) this.options.dispatchSelection(widget.id)
      else getWidgetRuntimePort().handleInteractiveEvent(widget.id, INTERACTIVE_EVENT_ENUM.Click)
    }
    /** 请求失败不提交页码和数据；重试仍使用本次失败的目标页与方向。 */
    let pending: Promise<void> = Promise.resolve()
    const loadPage = async (page: number, direction: -1 | 1) => {
      if (state.loading || !getWidgetPreviewState().value) return
      const currentVersion = ++version
      retryPage = page
      retryDirection = direction
      state.loading = true
      state.error = ''
      try {
        const config = buildRecordPaginationRequest(
          requestOverride ?? widget.component.dataConfig,
          binding,
          this.options.getPublicRequests(),
          page,
        )
        const result = await executeComponentDataRequest(
          config,
          this.options.getPublicRequests(),
          this.options.getRequestGlobalConfig(),
          this.options.getRuntimeContext?.(),
        )
        if (currentVersion !== version) return
        const total = validateRecordPaginationPage(result.raw, result.source, binding, page)
        Object.assign(state, {
          page,
          total,
          rows: result.source,
          index: direction === -1 ? Math.max(0, result.source.length - 1) : 0,
        })
        commitSelection()
      } catch (error) {
        if (currentVersion === version)
          state.error = error instanceof Error ? error.message : '列表请求失败，请重试。'
      } finally {
        if (currentVersion === version) state.loading = false
      }
    }
    // 所有列表入口登记同一实例的完成承诺，激活屏障不依靠轮询 loading 状态。
    const load = (page: number, direction: -1 | 1) => {
      if (state.loading) return pending
      pending = loadPage(page, direction)
      return pending
    }
    /** 退出预览或外部筛选变化时失效旧响应，清理旧的实例参数覆盖。 */
    const reset = () => {
      version += 1
      requestOverride = null
      Object.assign(state, {
        page: binding.firstPage,
        index: 0,
        rows: [],
        total: 0,
        loading: false,
        error: '',
      })
      retryPage = binding.firstPage
      retryDirection = 1
      setRecordPaginationSelection(widget.component, undefined, widget.id)
    }
    return {
      getDataConfig: () => widget.component.dataConfig,
      getPublicRequestId: () => {
        const item = getDataConfigRequests(widget.component.dataConfig).find(
          (item) => item.id === binding.requestId,
        )
        return item?.request.type === 'public'
          ? (item.request.config as { publicRequestId?: string }).publicRequestId
          : undefined
      },
      refreshPublicRequest: async () => {
        reset()
        await load(binding.firstPage, 1)
      },
      state,
      whenReady: () => pending,
      reset,
      updateWidget: (nextWidget) => {
        if (widget.component !== nextWidget.component) {
          setRecordPaginationSelection(widget.component, undefined, widget.id)
          const row = state.rows[state.index]
          setRecordPaginationSelection(
            nextWidget.component,
            row ? { requestId: binding.requestId, row } : undefined,
            nextWidget.id,
          )
        }
        widget = nextWidget
      },
      passParameters: async (assignments) => {
        const current =
          requestOverride ??
          resolveRecordPaginationRequest(
            widget.component.dataConfig,
            binding,
            this.options.getPublicRequests(),
          )
        if (!current) return
        const updated = applyInteractionRequestParameters(current, assignments)
        if (!updated.requestIds.length) return
        reset()
        requestOverride = updated.config
        await load(binding.firstPage, 1)
      },
      retry: () => load(retryPage, retryDirection),
      move: async (direction) => {
        if (!getWidgetPreviewState().value || !canMoveRecord(state, binding, direction)) return
        const nextIndex = state.index + direction
        if (nextIndex >= 0 && nextIndex < state.rows.length) {
          state.index = nextIndex
          state.error = ''
          commitSelection()
        } else await load(state.page + direction, direction)
      },
    }
  }
}
