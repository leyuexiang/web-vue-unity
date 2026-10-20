import { defineComponent, h, inject, ref, watch } from 'vue'
import type { Component, PropType, VNode } from 'vue'
import { Delete, Hide, Lock, Unlock, View } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { WidgetLayerNode } from '@/types/threeScene'
import {
  normalizePageFrameOption,
  type PageFrameSelectableChild,
} from '@/packages/components/Widget/VPageMenu/pageFrameTypes'
import {
  getWidgetDisplayName,
  getWidgetVisibleState,
  setWidgetDragData,
  type WidgetMenuContextPayload,
} from './structurePanelHelpers'
import { STRUCTURE_SELECTION_EXPANSION_KEY } from './structurePanelSelectionHelpers'

const WidgetLeafItem: Component = defineComponent({
  name: 'WidgetLeafItem',
  props: {
    widgetNode: {
      type: Object as PropType<Extract<WidgetLayerNode, { type: 'widget' }>>,
      required: true,
    },
    widgetEntry: { type: Object as PropType<WidgetConfig | null>, required: true },
    selectedWidgetIds: { type: Array as PropType<string[]>, required: true },
    selectedChildId: { type: String, default: '' },
    locked: { type: Boolean, default: false },
    inheritedLocked: { type: Boolean, default: false },
    widgetMap: {
      type: Object as PropType<Map<string, WidgetConfig>>,
      required: true,
    },
    childrenMap: {
      type: Object as PropType<Map<string, string[]>>,
      required: true,
    },
    depth: { type: Number, default: 0 },
    dragDisabled: { type: Boolean, default: false },
    dropTargetWidgetId: { type: String, default: '' },
    // 递归透传排序目标，子节点也展示与根节点一致的插入线。
    sortGapTarget: {
      type: Object as PropType<{ relatedWidgetId: string; placement: 'before' | 'after' } | null>,
      default: null,
    },
  },
  emits: [
    'select-widget',
    'select-widget-child',
    'toggle-visible',
    'toggle-lock',
    'toggle-widget-child-visible',
    'toggle-widget-child-lock',
    'delete-widget',
    'open-menu',
    'widget-drag-start',
    'widget-drag-end',
    'move-widgets-under-parent',
  ],
  setup(props, { emit }) {
    /** 页面框架明细与普通父子组件均默认折叠，避免进入结构面板时渲染完整深层节点树。 */
    const frameExpanded = ref(false)
    const hierarchyExpanded = ref(false)
    const selectionExpansion = inject(STRUCTURE_SELECTION_EXPANSION_KEY, null)
    /**
     * 新挂载的深层节点立即消费同一份路径，确保本轮渲染即可逐层露出选中节点。
     * 只展开祖先，选中组件自身及无关分支保持折叠；后续仍可手动切换，
     * 结构列表内选择会返回空路径并保留展开状态，下一次画布等外部选择才恢复自动定位，
     * 避免响应式计算强制锁住展开按钮或重置用户正在浏览的分支。
     */
    watch(
      () => selectionExpansion?.value,
      (expansion) => {
        if (!expansion) return
        hierarchyExpanded.value = expansion.widgetIds.has(props.widgetNode.id)
        frameExpanded.value = expansion.frameId === props.widgetNode.id
      },
      { immediate: true },
    )
    const stop = (event: MouseEvent) => event.stopPropagation()
    const iconButton = (options: {
      title: string
      size: number
      disabled?: boolean
      danger?: boolean
      icon: ReturnType<typeof h>
      onClick: () => void
    }) =>
      h(
        'button',
        {
          type: 'button',
          class: ['scene-edit-structure-action-button', options.danger ? 'is-danger' : undefined],
          title: options.title,
          disabled: options.disabled,
          onMousedown: stop,
          onClick: (event: MouseEvent) => {
            stop(event)
            options.onClick()
          },
        },
        [h(ElIcon, { size: options.size }, { default: () => options.icon })],
      )
    const frameOption = () =>
      props.widgetEntry?.component.info.keyName === 'VPageMenu'
        ? normalizePageFrameOption(props.widgetEntry.component.option)
        : null

    const childRow = (child: PageFrameSelectableChild, label: string, depth = 1) =>
      h(
        'div',
        {
          class: [
            'scene-edit-structure-item',
            'scene-edit-structure-item--widget-child',
            { 'is-active': props.selectedChildId === child.id },
          ],
          style: { paddingLeft: `${12 + depth * 14}px` },
          onMousedown: (event: MouseEvent) => {
            event.stopPropagation()
            emit('select-widget-child', {
              event,
              frameId: props.widgetNode.id,
              childId: child.id,
            })
          },
        },
        [
          h(
            'span',
            { class: 'scene-edit-structure-child-mark', 'aria-hidden': 'true' },
            depth > 1 ? '└' : '•',
          ),
          h('span', { class: 'scene-edit-structure-child-label' }, label),
          h('div', { class: 'flex gap-2 scene-edit-structure-actions' }, [
            iconButton({
              title: child.visible ? '隐藏子节点' : '显示子节点',
              size: 13,
              icon: h(child.visible ? View : Hide),
              onClick: () =>
                emit('toggle-widget-child-visible', props.widgetNode.id, child.id, !child.visible),
            }),
            iconButton({
              title: child.locked ? '解锁子节点' : '锁定子节点',
              size: 13,
              disabled: props.locked || props.inheritedLocked,
              icon: h(child.locked ? Lock : Unlock),
              onClick: () =>
                emit('toggle-widget-child-lock', props.widgetNode.id, child.id, !child.locked),
            }),
          ]),
        ],
      )

    const pageFrameChildren = () => {
      const option = frameOption()
      if (!option || !frameExpanded.value) return null
      const left = option.menuChildren.filter((child) => child.side === 'left')
      const right = option.menuChildren.filter((child) => child.side === 'right')
      return h('div', { class: 'scene-edit-structure-widget-children' }, [
        childRow(option.logo, 'Logo'),
        childRow(option.menuSlots.left, '左侧菜单'),
        ...left.map((child) => childRow(child, child.label || '未命名菜单', 2)),
        childRow(option.title, '中央标题'),
        childRow(option.menuSlots.right, '右侧菜单'),
        ...right.map((child) => childRow(child, child.label || '未命名菜单', 2)),
        childRow(option.weather, '天气'),
        childRow(option.time, '时间'),
        childRow(option.account, '管理员'),
      ])
    }

    return (): VNode => {
      const isPageFrame = props.widgetEntry?.component.info.keyName === 'VPageMenu'
      const childWidgetIds = props.childrenMap.get(props.widgetNode.id) || []
      const isSelected =
        props.selectedWidgetIds.includes(props.widgetNode.id) && !props.selectedChildId
      const mainRow = h(
        'div',
        {
          // 每层真实组件行都有独立标识，落点不能借用包含整棵子树的外层矩形。
          'data-widget-row-id': props.widgetNode.id,
          class: ['scene-edit-structure-item', { 'is-active': isSelected }],
          style: props.depth > 0 ? { paddingLeft: `${12 + props.depth * 14}px` } : undefined,
          draggable: props.depth > 0 && !props.dragDisabled && !props.locked,
          onDragstart: (event: DragEvent) => {
            if (props.depth === 0 || props.dragDisabled || props.locked) return
            event.stopPropagation()
            if (event.dataTransfer) {
              setWidgetDragData(event.dataTransfer, event.currentTarget as HTMLElement)
            }
            emit('widget-drag-start', props.widgetNode.id)
          },
          // 根节点与原生子节点统一消费面板的悬停状态，避免双计时器在排序边缘误挂载。
          onDragend: (event: DragEvent) => {
            event.stopPropagation()
            emit('widget-drag-end')
          },
          onDragover: (event: DragEvent) => {
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
          },
          onDrop: (event: DragEvent) => {
            event.preventDefault()
            event.stopPropagation()
            if (props.dropTargetWidgetId === props.widgetNode.id) {
              emit('move-widgets-under-parent', props.widgetNode.id)
            }
          },
          onMousedown: (event: MouseEvent) =>
            emit('select-widget', { event, widgetId: props.widgetNode.id }),
          onDblclick: (event: MouseEvent) => {
            event.stopPropagation()
            if (isPageFrame) frameExpanded.value = !frameExpanded.value
            else emit('select-widget', { event, widgetId: props.widgetNode.id })
          },
          onContextmenu: (event: MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            const payload: WidgetMenuContextPayload = {
              event,
              widgetId: props.widgetNode.id,
            }
            emit('open-menu', payload)
          },
        },
        [
          h('div', { class: 'flex justify-between items-center flex-auto gap-2 min-w-0' }, [
            childWidgetIds.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: [
                      'scene-edit-structure-expand',
                      { 'is-expanded': hierarchyExpanded.value },
                    ],
                    title: hierarchyExpanded.value ? '收起子组件' : '展开子组件',
                    onMousedown: stop,
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      hierarchyExpanded.value = !hierarchyExpanded.value
                    },
                  },
                  [h('span', { class: 'scene-edit-collapse-icon', 'aria-hidden': 'true' })],
                )
              : null,
            isPageFrame
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: ['scene-edit-structure-expand', { 'is-expanded': frameExpanded.value }],
                    title: frameExpanded.value ? '收起页面框架' : '展开页面框架',
                    onMousedown: stop,
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      frameExpanded.value = !frameExpanded.value
                    },
                  },
                  [h('span', { class: 'scene-edit-collapse-icon', 'aria-hidden': 'true' })],
                )
              : null,
            h(
              'div',
              {
                class:
                  'text-[13px] whitespace-nowrap text-ellipsis overflow-hidden flex-auto min-w-0',
              },
              getWidgetDisplayName(props.widgetEntry, props.widgetNode.id),
            ),
          ]),
          h('div', { class: 'flex gap-2 scene-edit-structure-actions' }, [
            iconButton({
              title: getWidgetVisibleState(props.widgetEntry) ? '隐藏组件' : '显示组件',
              size: 14,
              icon: h(getWidgetVisibleState(props.widgetEntry) ? View : Hide),
              onClick: () =>
                emit(
                  'toggle-visible',
                  props.widgetNode.id,
                  !getWidgetVisibleState(props.widgetEntry),
                ),
            }),
            iconButton({
              title: props.inheritedLocked
                ? '请先解锁所属分组'
                : props.locked
                  ? '解锁组件'
                  : '锁定组件',
              size: 14,
              disabled: props.inheritedLocked,
              icon: h(props.locked || props.inheritedLocked ? Lock : Unlock),
              onClick: () => {
                if (!props.inheritedLocked) emit('toggle-lock', props.widgetNode.id, !props.locked)
              },
            }),
            iconButton({
              title: props.locked || props.inheritedLocked ? '锁定状态不可删除' : '删除组件',
              size: 14,
              disabled: props.locked || props.inheritedLocked,
              danger: true,
              icon: h(Delete),
              onClick: () => {
                if (!props.locked && !props.inheritedLocked) {
                  emit('delete-widget', props.widgetNode.id)
                }
              },
            }),
          ]),
        ],
      )
      return h('div', { class: 'scene-edit-structure-widget-node' }, [
        h(
          'div',
          {
            style: { position: 'relative' },
            class: {
              'is-widget-sort-gap-before':
                props.depth > 0 &&
                props.sortGapTarget?.relatedWidgetId === props.widgetNode.id &&
                props.sortGapTarget.placement === 'before',
              'is-widget-sort-gap-after':
                props.depth > 0 &&
                props.sortGapTarget?.relatedWidgetId === props.widgetNode.id &&
                props.sortGapTarget.placement === 'after',
              'is-widget-hierarchy-drop-target': props.dropTargetWidgetId === props.widgetNode.id,
            },
          },
          [mainRow],
        ),
        pageFrameChildren(),
        hierarchyExpanded.value && childWidgetIds.length > 0
          ? h(
              'div',
              { class: 'scene-edit-structure-widget-children' },
              childWidgetIds.map(
                (childId): VNode =>
                  h(WidgetLeafItem, {
                    key: childId,
                    widgetNode: { id: childId, type: 'widget' },
                    widgetEntry: props.widgetMap.get(childId) || null,
                    selectedWidgetIds: props.selectedWidgetIds,
                    selectedChildId: props.selectedChildId,
                    locked:
                      props.locked ||
                      Boolean(
                        (
                          props.widgetMap.get(childId)?.component.option as
                            | Record<string, unknown>
                            | undefined
                        )?.locked,
                      ),
                    inheritedLocked: props.inheritedLocked || props.locked,
                    widgetMap: props.widgetMap,
                    childrenMap: props.childrenMap,
                    depth: props.depth + 1,
                    dragDisabled: props.dragDisabled,
                    dropTargetWidgetId: props.dropTargetWidgetId,
                    sortGapTarget: props.sortGapTarget,
                    onSelectWidget: (payload: { event: MouseEvent; widgetId: string }) =>
                      emit('select-widget', payload),
                    onSelectWidgetChild: (payload: {
                      event: MouseEvent
                      frameId: string
                      childId: string
                    }) => emit('select-widget-child', payload),
                    onToggleVisible: (widgetId: string, visible: boolean) =>
                      emit('toggle-visible', widgetId, visible),
                    onToggleLock: (widgetId: string, locked: boolean) =>
                      emit('toggle-lock', widgetId, locked),
                    onToggleWidgetChildVisible: (
                      frameId: string,
                      childId: string,
                      visible: boolean,
                    ) => emit('toggle-widget-child-visible', frameId, childId, visible),
                    onToggleWidgetChildLock: (frameId: string, childId: string, locked: boolean) =>
                      emit('toggle-widget-child-lock', frameId, childId, locked),
                    onDeleteWidget: (widgetId: string) => emit('delete-widget', widgetId),
                    onOpenMenu: (payload: WidgetMenuContextPayload) => emit('open-menu', payload),
                    onWidgetDragStart: (widgetId: string) => emit('widget-drag-start', widgetId),
                    onWidgetDragEnd: () => emit('widget-drag-end'),
                    onMoveWidgetsUnderParent: (widgetId: string) =>
                      emit('move-widgets-under-parent', widgetId),
                  }),
              ),
            )
          : null,
      ])
    }
  },
})

export default WidgetLeafItem
