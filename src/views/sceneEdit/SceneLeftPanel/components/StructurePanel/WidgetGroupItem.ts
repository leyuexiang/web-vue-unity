import { defineComponent, h, resolveComponent } from 'vue'
import type { PropType } from 'vue'
import { Delete, Hide, Lock, Unlock, View } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import draggable from 'vuedraggable'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { WidgetLayerGroupNode } from '@/types/threeScene'
import {
  setWidgetDragData,
  type WidgetMenuContextPayload,
  type WidgetSortableMoveEvent,
} from './structurePanelHelpers'
import WidgetLeafItem from './WidgetLeafItem'

/**
 * 分组节点独立成渲染组件，统一承接组头动作与组内拖拽。
 *
 * 主面板只负责把状态和回调注入进来，不再同时维护根模板和局部渲染函数，
 * 这样后续继续拆“分组菜单动作”和“拖拽排序适配”时边界更清楚。
 */
export default defineComponent({
  name: 'WidgetGroupItem',
  props: {
    groupNode: {
      type: Object as PropType<WidgetLayerGroupNode>,
      required: true,
    },
    expanded: {
      type: Boolean,
      required: true,
    },
    selectedGroupId: {
      type: String,
      default: null,
    },
    selectedGroupIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    selectedWidgetIds: {
      type: Array as PropType<string[]>,
      required: true,
    },
    selectedChildId: { type: String, default: '' },
    widgetMap: {
      type: Object as PropType<Map<string, WidgetConfig>>,
      required: true,
    },
    childrenMap: {
      type: Object as PropType<Map<string, string[]>>,
      required: true,
    },
    groupMap: {
      type: Object as PropType<Map<string, WidgetLayerGroupNode>>,
      required: true,
    },
    expandedGroupIds: {
      type: Array as PropType<string[]>,
      required: true,
    },
    groupDeleteDisabledIds: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    dragDisabled: {
      type: Boolean,
      default: false,
    },
    groupVisible: {
      type: Boolean,
      required: true,
    },
    groupLocked: {
      type: Boolean,
      default: false,
    },
    deleteDisabled: {
      type: Boolean,
      default: false,
    },
    dropTargetWidgetId: { type: String, default: '' },
    dropTargetGroupId: { type: String, default: '' },
    sortGapTarget: {
      type: Object as PropType<{
        relatedWidgetId: string
        placement: 'before' | 'after'
      } | null>,
      default: null,
    },
    widgetMoveGuard: {
      type: Function as PropType<
        (
          event: WidgetSortableMoveEvent,
          originalEvent?: {
            clientX?: number
            clientY?: number
            target?: EventTarget | null
            touches?: ArrayLike<{ clientY: number }>
          },
        ) => boolean
      >,
      required: true,
    },
  },
  emits: [
    'toggle-expand',
    'select-group',
    'select-widget',
    'select-widget-child',
    'toggle-widget-visible',
    'toggle-widget-lock',
    'toggle-widget-child-visible',
    'toggle-widget-child-lock',
    'delete-widget',
    'open-menu',
    'toggle-group-visible',
    'toggle-group-lock',
    'delete-group',
    'move-widget',
    'widget-drag-start',
    'widget-drag-end',
    'move-widgets-under-parent',
  ],
  setup(props, { emit }) {
    const RecursiveWidgetGroupItem = resolveComponent('WidgetGroupItem')
    const getVisibleGroupWidgetIds = (group: WidgetLayerGroupNode) => {
      const groupWidgetIds = new Set(group.children)
      return group.children.filter((widgetId) => {
        const parentId = props.widgetMap.get(widgetId)?.parentId
        return !parentId || !groupWidgetIds.has(parentId)
      })
    }
    const countGroupWidgets = (
      group: WidgetLayerGroupNode,
      visitedIds = new Set<string>(),
    ): number => {
      if (visitedIds.has(group.id)) return 0
      const nextVisitedIds = new Set(visitedIds).add(group.id)
      const sourceGroup = props.groupMap.get(group.id) || group
      return (
        sourceGroup.children.length +
        (sourceGroup.childGroupIds || []).reduce((total, childGroupId) => {
          const childGroup = props.groupMap.get(childGroupId)
          return total + (childGroup ? countGroupWidgets(childGroup, nextVisitedIds) : 0)
        }, 0)
      )
    }

    return () =>
      h('div', { class: 'scene-edit-structure-group-node' }, [
        h(
          'div',
          {
            'data-structure-group-id': props.groupNode.id,
            class: [
              'scene-edit-structure-item',
              'scene-edit-structure-item--group',
              {
                'is-active':
                  props.selectedGroupId === props.groupNode.id ||
                  props.selectedGroupIds.includes(props.groupNode.id),
                'is-widget-group-drop-target': props.dropTargetGroupId === props.groupNode.id,
              },
            ],
            onMousedown: (event: MouseEvent) =>
              emit('select-group', { event, groupId: props.groupNode.id }),
            onContextmenu: (event: MouseEvent) => {
              event.preventDefault()
              /**
               * 分组节点不再弹结构树右键菜单。
               * 组级动作统一通过行内按钮暴露，避免菜单语义与部件多选菜单混杂。
               */
              event.stopPropagation()
            },
          },
          [
            h('div', { class: 'flex justify-between items-center flex-auto gap-2 min-w-0' }, [
              h('div', { class: 'flex items-center gap-2 flex-auto min-w-0' }, [
                h(
                  ElIcon,
                  {
                    class: ['scene-edit-structure-expand', { 'is-expanded': props.expanded }],
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      emit('toggle-expand', props.groupNode.id)
                    },
                  },
                  {
                    // 结构树分组与所有折叠面板共用 Figma Down（下）图标，父级仅负责状态旋转。
                    default: () => [
                      h('span', { class: 'scene-edit-collapse-icon', 'aria-hidden': 'true' }),
                    ],
                  },
                ),
                h(
                  'div',
                  {
                    class:
                      'text-[13px] whitespace-nowrap text-ellipsis overflow-hidden flex-auto min-w-0',
                  },
                  props.groupNode.name,
                ),
                h(
                  'span',
                  { class: 'scene-edit-structure-group-count', title: '组内组件数量' },
                  String(countGroupWidgets(props.groupNode)),
                ),
              ]),
              h('div', { class: 'flex gap-2 scene-edit-structure-actions' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'scene-edit-structure-action-button',
                    title: props.groupVisible ? '隐藏分组' : '显示分组',
                    onMousedown: (event: MouseEvent) => event.stopPropagation(),
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      emit('toggle-group-visible', props.groupNode.id)
                    },
                  },
                  [h(ElIcon, { size: 14 }, { default: () => h(props.groupVisible ? View : Hide) })],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'scene-edit-structure-action-button',
                    title: props.groupLocked ? '解锁分组' : '锁定分组',
                    onMousedown: (event: MouseEvent) => event.stopPropagation(),
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      emit('toggle-group-lock', props.groupNode.id, !props.groupLocked)
                    },
                  },
                  [
                    h(
                      ElIcon,
                      { size: 14 },
                      { default: () => h(props.groupLocked ? Lock : Unlock) },
                    ),
                  ],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'scene-edit-structure-action-button is-danger',
                    title: props.deleteDisabled ? '组内存在锁定组件，不可删除' : '删除分组',
                    disabled: props.deleteDisabled,
                    onMousedown: (event: MouseEvent) => event.stopPropagation(),
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      if (!props.deleteDisabled) emit('delete-group', props.groupNode.id)
                    },
                  },
                  [h(ElIcon, { size: 14 }, { default: () => h(Delete) })],
                ),
              ]),
            ]),
          ],
        ),
        props.expanded && (props.groupNode.childGroupIds || []).length
          ? h(
              'div',
              { class: 'scene-edit-structure-group-node__nested-groups' },
              (props.groupNode.childGroupIds || [])
                .map((groupId) => props.groupMap.get(groupId))
                .filter((group): group is WidgetLayerGroupNode => Boolean(group))
                .map((group) =>
                  h(RecursiveWidgetGroupItem, {
                    key: group.id,
                    groupNode: {
                      ...group,
                      children: getVisibleGroupWidgetIds(group),
                    },
                    expanded: props.expandedGroupIds.includes(group.id),
                    selectedGroupId: props.selectedGroupId,
                    selectedGroupIds: props.selectedGroupIds,
                    selectedWidgetIds: props.selectedWidgetIds,
                    selectedChildId: props.selectedChildId,
                    widgetMap: props.widgetMap,
                    childrenMap: props.childrenMap,
                    groupMap: props.groupMap,
                    expandedGroupIds: props.expandedGroupIds,
                    groupDeleteDisabledIds: props.groupDeleteDisabledIds,
                    dragDisabled: props.dragDisabled,
                    groupVisible: group.visible !== false,
                    groupLocked: group.locked === true,
                    deleteDisabled: props.groupDeleteDisabledIds.has(group.id),
                    dropTargetWidgetId: props.dropTargetWidgetId,
                    dropTargetGroupId: props.dropTargetGroupId,
                    sortGapTarget: props.sortGapTarget,
                    widgetMoveGuard: props.widgetMoveGuard,
                    onToggleExpand: (groupId: string) => emit('toggle-expand', groupId),
                    onSelectGroup: (payload: { event: MouseEvent; groupId: string }) =>
                      emit('select-group', payload),
                    onSelectWidget: (payload: { event: MouseEvent; widgetId: string }) =>
                      emit('select-widget', payload),
                    onSelectWidgetChild: (payload: {
                      event: MouseEvent
                      frameId: string
                      childId: string
                    }) => emit('select-widget-child', payload),
                    onToggleWidgetVisible: (widgetId: string, visible: boolean) =>
                      emit('toggle-widget-visible', widgetId, visible),
                    onToggleWidgetLock: (widgetId: string, locked: boolean) =>
                      emit('toggle-widget-lock', widgetId, locked),
                    onToggleWidgetChildVisible: (
                      frameId: string,
                      childId: string,
                      visible: boolean,
                    ) => emit('toggle-widget-child-visible', frameId, childId, visible),
                    onToggleWidgetChildLock: (frameId: string, childId: string, locked: boolean) =>
                      emit('toggle-widget-child-lock', frameId, childId, locked),
                    onDeleteWidget: (widgetId: string) => emit('delete-widget', widgetId),
                    onOpenMenu: (payload: WidgetMenuContextPayload) => emit('open-menu', payload),
                    onToggleGroupVisible: (groupId: string) =>
                      emit('toggle-group-visible', groupId),
                    onToggleGroupLock: (groupId: string, locked: boolean) =>
                      emit('toggle-group-lock', groupId, locked),
                    onDeleteGroup: (groupId: string) => emit('delete-group', groupId),
                    onMoveWidget: (widgetId: string, groupId: string, index?: number) =>
                      emit('move-widget', widgetId, groupId, index),
                    onWidgetDragStart: (widgetId: string) => emit('widget-drag-start', widgetId),
                    onWidgetDragEnd: () => emit('widget-drag-end'),
                    onMoveWidgetsUnderParent: (widgetId: string) =>
                      emit('move-widgets-under-parent', widgetId),
                  }),
                ),
            )
          : null,
        props.expanded
          ? h(
              draggable,
              {
                itemKey: 'id',
                /**
                 * 分组成员在持久化结构里仅保存 ID，而根列表使用节点对象。
                 * 拖拽层临时投影成同形节点，才能安全支持根级与分组间移动；落库仍由 Store 的
                 * moveWidgetToGroup 统一完成，避免界面层维护第二份顺序。
                 */
                modelValue: props.groupNode.children.map((id) => ({ id, type: 'widget' as const })),
                disabled: props.dragDisabled || props.groupLocked,
                group: { name: 'scene-widget-layer', pull: true, put: true },
                move: (
                  event: WidgetSortableMoveEvent,
                  originalEvent?: {
                    clientX?: number
                    clientY?: number
                    target?: EventTarget | null
                  },
                ) => {
                  const widgetId = event.draggedContext?.element?.id
                  const option = widgetId
                    ? (props.widgetMap.get(widgetId)?.component.option as
                        | Record<string, unknown>
                        | undefined)
                    : undefined
                  return option?.locked !== true && props.widgetMoveGuard(event, originalEvent)
                },
                ghostClass: 'scene-edit-structure-ghost',
                // 覆盖排序库的纯文本拖拽数据，避免浏览器触发“搜索文本”。
                setData: setWidgetDragData,
                onStart: (event: { item?: HTMLElement }) => {
                  const widgetId = event.item?.dataset.widgetId
                  if (widgetId) emit('widget-drag-start', widgetId)
                },
                onEnd: () => emit('widget-drag-end'),
                onChange: (event: {
                  added?: { element?: { id?: string }; newIndex?: number }
                  moved?: { element?: { id?: string }; newIndex?: number }
                }) => {
                  /**
                   * vuedraggable 会先同步发出 update:modelValue，下一微任务才发出 change。
                   * 此处刻意不监听前者，只由目标列表的 added 或当前列表的 moved 提交一次 Store
                   * 事务；源列表的 removed 不落库，避免跨组拖拽产生“先删后加”的两条历史。
                   */
                  const change = event.added || event.moved
                  const widgetId = change?.element?.id
                  if (widgetId) emit('move-widget', widgetId, props.groupNode.id, change?.newIndex)
                },
              },
              {
                item: ({ element }: { element: { id: string } }) =>
                  h(
                    'div',
                    {
                      class: [
                        'scene-edit-structure-group-node__child',
                        {
                          'is-widget-sort-gap-before':
                            props.sortGapTarget?.relatedWidgetId === element.id &&
                            props.sortGapTarget.placement === 'before',
                          'is-widget-sort-gap-after':
                            props.sortGapTarget?.relatedWidgetId === element.id &&
                            props.sortGapTarget.placement === 'after',
                        },
                      ],
                      'data-widget-id': element.id,
                    },
                    [
                      h(WidgetLeafItem, {
                        widgetNode: { id: element.id, type: 'widget' },
                        widgetEntry: props.widgetMap.get(element.id) || null,
                        selectedWidgetIds: props.selectedWidgetIds,
                        selectedChildId: props.selectedChildId,
                        locked: Boolean(
                          (
                            props.widgetMap.get(element.id)?.component.option as
                              | Record<string, unknown>
                              | undefined
                          )?.locked,
                        ),
                        inheritedLocked: props.groupLocked,
                        widgetMap: props.widgetMap,
                        childrenMap: props.childrenMap,
                        dragDisabled: props.dragDisabled,
                        dropTargetWidgetId: props.dropTargetWidgetId,
                        // 将插入线传到组件子树，保持嵌套节点的排序反馈一致。
                        sortGapTarget: props.sortGapTarget,
                        onSelectWidget: (payload: { event: MouseEvent; widgetId: string }) =>
                          emit('select-widget', payload),
                        onSelectWidgetChild: (payload: {
                          event: MouseEvent
                          frameId: string
                          childId: string
                        }) => emit('select-widget-child', payload),
                        onToggleVisible: (widgetId: string, visible: boolean) =>
                          emit('toggle-widget-visible', widgetId, visible),
                        onToggleLock: (widgetId: string, locked: boolean) =>
                          emit('toggle-widget-lock', widgetId, locked),
                        onToggleWidgetChildVisible: (
                          frameId: string,
                          childId: string,
                          visible: boolean,
                        ) => emit('toggle-widget-child-visible', frameId, childId, visible),
                        onToggleWidgetChildLock: (
                          frameId: string,
                          childId: string,
                          locked: boolean,
                        ) => emit('toggle-widget-child-lock', frameId, childId, locked),
                        onDeleteWidget: (widgetId: string) => emit('delete-widget', widgetId),
                        onOpenMenu: (payload: WidgetMenuContextPayload) =>
                          emit('open-menu', payload),
                        onWidgetDragStart: (widgetId: string) =>
                          emit('widget-drag-start', widgetId),
                        onWidgetDragEnd: () => emit('widget-drag-end'),
                        onMoveWidgetsUnderParent: (widgetId: string) =>
                          emit('move-widgets-under-parent', widgetId),
                      }),
                    ],
                  ),
              },
            )
          : null,
      ])
  },
})
