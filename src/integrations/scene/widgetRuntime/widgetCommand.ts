import { cloneDeep } from 'lodash-es'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { WidgetLayerNode } from '@/types/threeScene'

export interface WidgetHistoryEntry {
  id: string
  parentId?: string
  component: BaseWidgetConfig
}

export interface WidgetHistorySnapshot {
  /** 本次命令真正影响的部件编号；应用快照时不会覆盖无关部件。 */
  widgetIds: string[]
  /** 目标状态中的完整部件配置；缺失的受影响编号表示该部件应被移除。 */
  widgets: WidgetHistoryEntry[]
  /** 仅结构类操作携带图层树，普通属性编辑不复制整棵树。 */
  widgetLayerTree?: WidgetLayerNode[]
  /** 撤销或重做后需要恢复的部件选中态。 */
  currentWidgetsIds: string[] | null
  currentWidgetGroupId: string | null
  /** 结构树分组多选态；可与 currentWidgetsIds 同时存在以支持混合成组。 */
  currentWidgetGroupIds: string[]
}

export interface WidgetHistoryCommandContext {
  /** 把纯快照应用回二维仓库，命令本身不直接依赖状态管理实现。 */
  applyWidgetHistorySnapshot: (snapshot: WidgetHistorySnapshot) => void
}

/**
 * 二维部件快照命令。
 *
 * 该命令不再继承旧历史模块的 Command 基类，只实现统一命令总线适配器需要的最小协议。
 * 二维仓库仍采用“先应用、后登记”语义，因此首次提交由 CommandBus.recordExecuted 入栈，
 * 后续撤销和重做分别调用这里的 undo、redo。
 */
export default class WidgetCommand {
  readonly name: string
  private readonly oldSnapshot: WidgetHistorySnapshot
  private readonly newSnapshot: WidgetHistorySnapshot
  private readonly context: WidgetHistoryCommandContext

  constructor(
    name: string,
    oldSnapshot: WidgetHistorySnapshot,
    newSnapshot: WidgetHistorySnapshot,
    context: WidgetHistoryCommandContext,
  ) {
    this.name = name
    this.oldSnapshot = cloneDeep(oldSnapshot)
    this.newSnapshot = cloneDeep(newSnapshot)
    this.context = context
  }

  undo(): void {
    this.context.applyWidgetHistorySnapshot(this.oldSnapshot)
  }

  redo(): void {
    this.context.applyWidgetHistorySnapshot(this.newSnapshot)
  }
}
