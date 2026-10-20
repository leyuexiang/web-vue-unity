import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { INTERACTIVE_EVENT_ENUM } from '@/enums/scenePanelEnum'
import type { ConditionBlokList } from '@/types/threeScene'
import { evaluateConditionBlock } from '@/utils/renderScene/conditionRuntime'
import { useSceneWidgetStore, type WidgetConfig } from '@/stores/sceneEditStore'
import {
  createLegacySceneInteractionActionRuntimePort,
  type EditorSceneInteractionActionRuntimePort,
} from '@/integrations/scene/editorSceneInteractionActionRuntime'
import { ACTION_TYPE_ENUM } from '@/enums/scenePanelEnum'
import type { InteractionActionExecutionContext } from '@/utils/renderScene/interactionActionExecutors'
import {
  runInteractionSequence,
  isActionPending,
  createInteractionLifecycleGuard,
  type ActionCompletion,
} from '@/utils/renderScene/interactionActionSequence'
import {
  findPageFrameChild,
  type PageFrameOption,
} from '@/packages/components/Widget/VPageMenu/pageFrameTypes'

import { getWidgetRuntimePort } from './ports'

type WidgetConditionContext = Parameters<typeof evaluateConditionBlock>[1]

export interface WidgetEventRuntimeAdapter {
  getWidgetById: (widgetId: string) => WidgetConfig | null
  getWidgets: () => WidgetConfig[]
  evaluateConditionBlock: (
    conditionBlock: ConditionBlokList,
    context: WidgetConditionContext,
  ) => boolean
  executeActionList: (
    actionList: ConditionBlokList['actionList'],
    context?: Omit<InteractionActionExecutionContext, 'sceneApi'>,
  ) => ActionCompletion
}

const createDefaultWidgetEventRuntimeAdapter = (): WidgetEventRuntimeAdapter => ({
  getWidgetById: (widgetId) =>
    (useSceneWidgetStore().totalWidgets || []).find(
      (widget: WidgetConfig) => widget.id === widgetId,
    ) || null,
  getWidgets: () => useSceneWidgetStore().totalWidgets || [],
  evaluateConditionBlock: (conditionBlock, context) =>
    evaluateConditionBlock(conditionBlock, context),
  /**
   * 编辑器默认动作端口集中封装旧 renderScene 兼容逻辑。
   * 二维服务不再自行读取 sceneApi；发布预览会在具体调用时传入自己的运行时端口，
   * 从而避免把预览动作误发到编辑器已经销毁或尚未初始化的场景实例。
   */
  executeActionList: createLegacySceneInteractionActionRuntimePort().executeActionList,
})

/**
 * 二维部件事件运行端口。
 *
 * 动作端口是一次事件调用的上下文，不保存到模块级单例中。这样编辑器与发布预览即使短暂
 * 并存，也不会因异步渲染或动画帧调度而串用对方的 Three 运行时实例。
 */
export interface WidgetEventRuntimePort {
  handleWidgetInteractiveEvent: (
    widgetId: string,
    eventType: INTERACTIVE_EVENT_ENUM,
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
    childId?: string | null,
  ) => ActionCompletion
  executeAllWidgetStatusEvents: (
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
  ) => ActionCompletion
}

/**
 * 二维部件状态与交互运行服务。
 *
 * 旧三维事件模块只负责把触发时机转进来，具体部件列表读取、条件上下文和动作执行都收敛在这里。
 * 后续替换三维运行时后，二维 DOM 事件仍可继续复用该服务。
 */
export class WidgetEventRuntimeService implements WidgetEventRuntimePort {
  /** 状态可能按帧重复评估；同一来源只保留一条在途链和一次最新重评意图，不堆积加载回调。 */
  private readonly pendingStatus = new WeakMap<
    BaseWidgetConfig,
    {
      actionRuntime?: EditorSceneInteractionActionRuntimePort
      port: ReturnType<typeof getWidgetRuntimePort>
      pending: Promise<void>
      rerun: boolean
      isActive: () => boolean
    }
  >()
  constructor(
    private readonly adapter: WidgetEventRuntimeAdapter = createDefaultWidgetEventRuntimeAdapter(),
  ) {}

  handleWidgetInteractiveEvent(
    widgetId: string,
    eventType: INTERACTIVE_EVENT_ENUM,
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
    childId?: string | null,
  ) {
    const widgetEntry = this.adapter.getWidgetById(widgetId)
    if (!widgetEntry) return

    return this.executeWidgetEventList(
      widgetId,
      widgetEntry.component,
      eventType,
      actionRuntime,
      childId,
    )
  }

  executeAllWidgetStatusEvents(actionRuntime?: EditorSceneInteractionActionRuntimePort) {
    // 不同来源的状态规则独立启动，单个慢目标不会阻塞其它组件。
    const pending = this.adapter
      .getWidgets()
      .map((widget) => this.executeWidgetStatusEvents(widget.id, widget.component, actionRuntime))
      .filter((task): task is Promise<void> => Boolean(task))
    if (pending.length) return Promise.all(pending).then(() => undefined)
  }

  executeWidgetStatusEvents(
    widgetId: string,
    widget: BaseWidgetConfig,
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
  ): ActionCompletion {
    const statusList = widget.statusList
    if (!statusList?.length) return

    const port = getWidgetRuntimePort()
    const current = this.pendingStatus.get(widget)
    if (
      current &&
      current.actionRuntime === actionRuntime &&
      current.port === port &&
      current.isActive()
    ) {
      current.rerun = true
      return current.pending
    }
    const isActive = createInteractionLifecycleGuard(actionRuntime?.isActive)
    // 同一来源跨状态配置按顺序等待，不同来源由外层独立调度。
    const result = runInteractionSequence(
      statusList.filter((event) => event.isOpen),
      (event) =>
        this.executeMatchedConditionBlocks(
          widgetId,
          widget,
          event.conditionGroupList,
          actionRuntime,
        ),
      isActive,
    )
    if (!isActionPending(result)) return
    const state = { actionRuntime, port, pending: result, rerun: false, isActive }
    const finish = (): ActionCompletion => {
      if (this.pendingStatus.get(widget) !== state) return
      this.pendingStatus.delete(widget)
      if (state.rerun && isActive())
        return this.executeWidgetStatusEvents(widgetId, widget, actionRuntime)
    }
    state.pending = result.then(finish, finish)
    this.pendingStatus.set(widget, state)
    return state.pending
  }

  private executeWidgetEventList(
    widgetId: string,
    widget: BaseWidgetConfig,
    eventType: INTERACTIVE_EVENT_ENUM,
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
    childId?: string | null,
  ) {
    const child =
      childId && widget.info.keyName === 'VPageMenu'
        ? findPageFrameChild(widget.option as PageFrameOption, childId)
        : null
    const eventList = childId ? child?.interactiveEvent : widget.interactiveEvent
    if (!eventList?.length) return

    const isActive = createInteractionLifecycleGuard(actionRuntime?.isActive)
    // 单次点击可匹配多条事件配置，后续配置必须等待前序隐藏组件激活完成。
    return runInteractionSequence(
      eventList.filter((event) => event.isOpen && event.eventType === eventType),
      (event) =>
        this.executeMatchedConditionBlocks(
          widgetId,
          widget,
          event.conditionGroupList,
          actionRuntime,
        ),
      isActive,
    )
  }

  private executeMatchedConditionBlocks(
    widgetId: string,
    widget: BaseWidgetConfig,
    conditionGroupList?: { conditionBlokList?: ConditionBlokList[] }[],
    actionRuntime?: EditorSceneInteractionActionRuntimePort,
  ) {
    /**
     * 条件块之间互不短路。
     * 单个条件块不满足时只跳过当前动作，后续条件块仍需继续判断。
     */
    const isActive = createInteractionLifecycleGuard(actionRuntime?.isActive)
    // 沿用原有按序判断语义：前序动作完成后，再判断后续条件块。
    return runInteractionSequence(
      this.getConditionBlockList(conditionGroupList),
      (conditionBlock) => {
        if (!this.checkWidgetConditionBlock(conditionBlock, widgetId, widget)) return
        /**
         * 显式传入的端口优先级最高：发布预览需要把动作作用到自己的只读渲染实例。
         * 未传入时才使用编辑器默认端口，完整保持旧模块直接调用服务时的兼容行为。
         */
        const actionContext = this.shouldPassWidgetSourceContext(conditionBlock.actionList)
          ? {
              sourceWidget: widget,
              // 所有传参来源携带稳定编号，动作执行时读取输入框等组件最新上报的值。
              sourceWidgetId: widgetId,
            }
          : undefined
        if (actionRuntime) {
          if (actionContext) {
            return actionRuntime.executeActionList(conditionBlock.actionList, actionContext)
          } else {
            return actionRuntime.executeActionList(conditionBlock.actionList)
          }
        } else if (actionContext) {
          return this.adapter.executeActionList(conditionBlock.actionList, actionContext)
        } else {
          // 旧动作不需要上下文，保持历史调用签名，避免对外部适配器产生无意义变更。
          return this.adapter.executeActionList(conditionBlock.actionList)
        }
      },
      isActive,
    )
  }

  /** 参数化模型/部件动作需要携带触发源，旧动作继续走单参数调用保持兼容。 */
  private shouldPassWidgetSourceContext(actionList: ConditionBlokList['actionList']) {
    return actionList.some(
      (action) =>
        action.actionType === ACTION_TYPE_ENUM.WidgetVisibilityWithValue ||
        action.actionType === ACTION_TYPE_ENUM.ModelVisibilityWithValue ||
        // 统一传参动作同样需要触发源的数据快照。
        action.actionType === ACTION_TYPE_ENUM.PassParameters,
    )
  }

  /**
   * 规则面板保存的是“条件组 -> 条件块”结构。
   * 运行态只需要线性执行条件块，这里提前摊平，减少主流程分支。
   */
  private getConditionBlockList(
    conditionGroupList?: { conditionBlokList?: ConditionBlokList[] }[],
  ) {
    if (!conditionGroupList?.length) return []
    return conditionGroupList.flatMap((conditionGroup) => conditionGroup.conditionBlokList || [])
  }

  private checkWidgetConditionBlock(
    conditionBlock: ConditionBlokList,
    widgetId: string,
    widget: BaseWidgetConfig,
  ) {
    return this.adapter.evaluateConditionBlock(conditionBlock, {
      kind: 'widget',
      widgetId,
      widget,
    })
  }
}

const widgetEventRuntimeService = new WidgetEventRuntimeService()

export const getWidgetEventRuntimeService = () => widgetEventRuntimeService
