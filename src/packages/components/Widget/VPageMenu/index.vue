<template>
  <div
    class="page-frame"
    :class="`page-frame--${frame.layout}`"
    :style="frameStyle"
    data-page-frame="true"
    aria-label="页面框架"
  >
    <div
      class="page-frame__background"
      data-page-frame-background="outer-frame"
      aria-hidden="true"
    ></div>
    <header class="page-frame__topbar">
      <button
        type="button"
        class="page-frame__slot page-frame__logo"
        :class="childClass(frame.logo.id, frame.logo.visible)"
        :style="positionedStyle(frame.logo)"
        :data-page-frame-child-id="frame.logo.id"
        :aria-hidden="!frame.logo.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.logo)"
      >
        <img v-if="frame.logo.imageUrl" :src="frame.logo.imageUrl" alt="" /><span>{{
          frame.logo.text
        }}</span>
      </button>

      <!-- 菜单按钮先在 PageMenuBranch 中选中自身；容器只兜底处理空白区域，不能抢先捕获点击。 -->
      <nav
        class="page-frame__slot page-frame__menus page-frame__menus--left"
        :class="childClass(frame.menuSlots.left.id, frame.menuSlots.left.visible)"
        :style="menuSlotStyle(frame.menuSlots.left, 'left')"
        aria-label="左侧菜单"
        :data-page-frame-child-id="frame.menuSlots.left.id"
        :aria-hidden="!frame.menuSlots.left.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.menuSlots.left)"
      >
        <PageMenuBranch
          v-for="root in leftMenus"
          :key="root.id"
          :root="root"
          side="left"
          :active-menu-id="activeMenuId"
          :expanded-root-id="expandedRootId"
          :expanded-child-id="expandedChildId"
          :selected="selectedChildId === root.id"
          :is-tcm-bottom="frame.layout === 'tcm-bottom'"
          :is-showroom-top="frame.layout === 'showroom-top'"
          @select-child="startMenuChildDrag($event, root.id)"
          @icon-drag-start="(event, active) => startMenuIconDrag(event, root.id, active)"
          @icon-resize="
            (event, handle, active) => startMenuIconResize(event, root.id, handle, active)
          "
          @resize-child="(event, handle) => startMenuChildResize(event, root.id, handle)"
          @toggle-root="toggleRootMenu"
          @node-click="handleNodeClick"
        />
      </nav>

      <button
        type="button"
        class="page-frame__slot page-frame__title"
        :class="childClass(frame.title.id, frame.title.visible)"
        :style="titlePositionedStyle(frame.title)"
        :data-page-frame-child-id="frame.title.id"
        :aria-hidden="!frame.title.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.title)"
      >
        <strong :style="textStyle(frame.title.style)">{{ frame.title.text }}</strong>
        <small :style="textStyle(frame.title.subtitleStyle)">{{ frame.title.subtitle }}</small>
      </button>

      <nav
        class="page-frame__slot page-frame__menus page-frame__menus--right"
        :class="childClass(frame.menuSlots.right.id, frame.menuSlots.right.visible)"
        :style="menuSlotStyle(frame.menuSlots.right, 'right')"
        aria-label="右侧菜单"
        :data-page-frame-child-id="frame.menuSlots.right.id"
        :aria-hidden="!frame.menuSlots.right.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.menuSlots.right)"
      >
        <PageMenuBranch
          v-for="root in rightMenus"
          :key="root.id"
          :root="root"
          side="right"
          :active-menu-id="activeMenuId"
          :expanded-root-id="expandedRootId"
          :expanded-child-id="expandedChildId"
          :selected="selectedChildId === root.id"
          :is-tcm-bottom="frame.layout === 'tcm-bottom'"
          :is-showroom-top="frame.layout === 'showroom-top'"
          @select-child="startMenuChildDrag($event, root.id)"
          @icon-drag-start="(event, active) => startMenuIconDrag(event, root.id, active)"
          @icon-resize="
            (event, handle, active) => startMenuIconResize(event, root.id, handle, active)
          "
          @resize-child="(event, handle) => startMenuChildResize(event, root.id, handle)"
          @toggle-root="toggleRootMenu"
          @node-click="handleNodeClick"
        />
      </nav>

      <button
        type="button"
        class="page-frame__slot page-frame__weather"
        :class="childClass(frame.weather.id, frame.weather.visible)"
        :style="positionedStyle(frame.weather)"
        :data-page-frame-child-id="frame.weather.id"
        :aria-hidden="!frame.weather.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.weather)"
      >
        <img v-if="weatherImageUrl" :src="weatherImageUrl" alt="" />
        <component
          v-else-if="weatherIconComponent"
          :is="weatherIconComponent"
          class="page-frame__weather-icon"
        />
        <span class="page-frame__weather-main">{{ frame.weather.temperature }}</span
        ><span>{{ frame.weather.condition }}</span>
      </button>

      <button
        type="button"
        class="page-frame__slot page-frame__time"
        :class="childClass(frame.time.id, frame.time.visible)"
        :style="positionedStyle(frame.time)"
        :data-page-frame-child-id="frame.time.id"
        :aria-hidden="!frame.time.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.time)"
      >
        <time :style="textStyle(frame.time.style)">{{
          frame.layout === 'showroom-top' ? currentDate.replace(/-/g, '.') : currentDate
        }}</time>
        <time :style="textStyle(frame.time.style)">{{ currentTime }}</time>
      </button>

      <button
        type="button"
        class="page-frame__slot page-frame__account"
        :class="childClass(frame.account.id, frame.account.visible)"
        :style="positionedStyle(frame.account)"
        :data-page-frame-child-id="frame.account.id"
        :aria-hidden="!frame.account.visible || undefined"
        @mousedown="startPositionableChildDrag($event, frame.account)"
      >
        <span class="page-frame__avatar"
          ><img v-if="frame.account.avatarUrl" :src="frame.account.avatarUrl" alt="" /><span
            v-else
            >{{ frame.account.name.slice(0, 1) }}</span
          ></span
        >
        <span class="page-frame__account-copy"
          ><strong>{{ frame.account.name }}</strong
          ><small>{{ frame.account.role }}</small></span
        >
      </button>
    </header>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getWidgetRuntimePort } from '@/integrations/scene/widgetRuntime'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import { useCurrentDateTime } from '@/packages/shared/currentDateTime'
import PageMenuBranch from './PageMenuBranch.vue'
import {
  resolveGoviewIconComponent,
  resolveGoviewIconItem,
} from '@/packages/components/Widget/Icon/iconCatalog'
import {
  normalizePageFrameOption,
  resolvePageFrameWeatherIconName,
  resolvePageFrameWeatherImage,
  type PageFrameOption,
  type PageFramePositionableChild,
  type PageFrameResizeHandle,
  type PageFrameTextStyle,
} from './pageFrameTypes'
import { hydrateTcmMenuIconResources } from './tcmMenuIconResources'
import type { PageMenuNode } from './menuTree'

defineOptions({ name: 'VPageMenu' })
type PageFrameChildDragRect = { id: string; l: number; t: number; w: number; h: number }
type PageFrameChildDragPayload = {
  childId: string
  event: MouseEvent
  movingRect: PageFrameChildDragRect
  targets: PageFrameChildDragRect[]
  canvas: { width: number; height: number }
}
type PageFrameChildResizePayload = PageFrameChildDragPayload & {
  handle: PageFrameResizeHandle
}
type PageFrameMenuIconDragPayload = PageFrameChildDragPayload & {
  active: boolean
}
type PageFrameMenuIconResizePayload = PageFrameMenuIconDragPayload & {
  handle: PageFrameResizeHandle
}
const emit = defineEmits<{
  selectChild: [childId: string]
  dragChild: [payload: PageFrameChildDragPayload]
  resizeChild: [payload: PageFrameChildResizePayload]
  dragIcon: [payload: PageFrameMenuIconDragPayload]
  resizeIcon: [payload: PageFrameMenuIconResizePayload]
}>()
const props = defineProps<{
  option: PageFrameOption
  widgetId?: string
  selectedChildId?: string
}>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()
const { date: currentDate, time: currentTime } = useCurrentDateTime()
const frame = computed(() => normalizePageFrameOption(props.option))
const weatherImageUrl = computed(() => resolvePageFrameWeatherImage(frame.value.weather))
const weatherIconName = computed(() => resolvePageFrameWeatherIconName(frame.value.weather))
const weatherIconComponent = computed(() => {
  const icon = resolveGoviewIconItem(weatherIconName.value)
  return icon?.category === 'weather' ? resolveGoviewIconComponent(weatherIconName.value) : null
})
const activeMenuId = ref('')
const expandedRootId = ref('')
const expandedChildId = ref('')
const visibleMenus = computed(() => frame.value.menuChildren.filter((item) => item.visible))
/** 只监听菜单布局和文字；图标地址由资源匹配异步回填，避免回填后重复发起请求。 */
const tcmMenuResourceSignature = computed(() =>
  [
    props.option.layout,
    ...props.option.menuChildren.map((menu) => `${menu.id}:${menu.label}`),
  ].join('|'),
)
const leftMenus = computed(() => visibleMenus.value.filter((item) => item.side === 'left'))
const rightMenus = computed(() => visibleMenus.value.filter((item) => item.side === 'right'))
const isEditing = () => !getWidgetRuntimePort().isPreview()
const childClass = (childId: string, visible = true) => ({
  'is-editing': isEditing(),
  'is-selected': props.selectedChildId === childId,
  'is-hidden': !visible,
})
const textStyle = (style: PageFrameTextStyle) => ({
  color: style.color,
  fontFamily: style.fontFamily,
  fontSize: `${style.fontSize}px`,
  fontWeight: style.fontWeight,
})
const positionedStyle = (child: PageFramePositionableChild & { style?: PageFrameTextStyle }) => ({
  ...(child.style ? textStyle(child.style) : {}),
  transform: `translate(${child.offsetX}px, ${child.offsetY}px)`,
})
const titlePositionedStyle = (child: PageFramePositionableChild) => ({
  transform:
    frame.value.layout === 'tcm-bottom'
      ? `translate(calc(-50% + ${child.offsetX}px), calc(-50% + ${child.offsetY}px))`
      : `translate(calc(-50% + ${child.offsetX}px), ${child.offsetY}px)`,
})
const menuSlotStyle = (slot: typeof frame.value.menuSlots.left, side: 'left' | 'right') => {
  const tcmBottomLeftOffset =
    frame.value.menuSlots.right.visible && rightMenus.value.length ? '-100% - 12px' : '-50%'

  return {
    ...positionedStyle(slot),
    transform:
      frame.value.layout === 'factory-bottom' && side === 'left'
        ? `translate(calc(-100% + ${slot.offsetX}px), ${slot.offsetY}px)`
        : frame.value.layout === 'tcm-bottom' && side === 'left'
          ? `translate(calc(${tcmBottomLeftOffset} + ${slot.offsetX}px), ${slot.offsetY}px)`
          : frame.value.layout === 'tcm-bottom' && side === 'right'
            ? `translate(calc(12px + ${slot.offsetX}px), ${slot.offsetY}px)`
            : `translate(${slot.offsetX}px, ${slot.offsetY}px)`,
    '--page-frame-menu-gap': `${slot.itemGap}px`,
  }
}
const frameStyle = computed<Record<string, string>>(() => ({
  '--page-frame-background-image': `url(${JSON.stringify(frame.value.background.value)})`,
  '--page-frame-background-opacity': String(frame.value.background.opacity),
}))
const selectChild = (event: MouseEvent, childId: string) => {
  if (!isEditing()) return
  event.preventDefault()
  event.stopPropagation()
  emit('selectChild', childId)
}

/**
 * 子节点的 DOM 矩形会受到整个发布舞台 CSS 缩放影响。
 * 在拖拽开始时统一换算回页面框架自身的逻辑坐标，外层即可复用画布级吸附算法，
 * 而无需了解 Logo、天气、菜单和账户各自的 Grid 布局细节。
 */
const collectChildDragGeometry = (event: MouseEvent, childId: string) => {
  const eventElement = event.currentTarget as HTMLElement | null
  const sourceElement =
    eventElement?.closest<HTMLElement>('[data-page-frame-child-id]') || eventElement
  const frameElement = sourceElement?.closest<HTMLElement>('[data-page-frame="true"]')
  if (!sourceElement || !frameElement || !frameElement.offsetWidth || !frameElement.offsetHeight) {
    return null
  }

  const frameRect = frameElement.getBoundingClientRect()
  const scaleX = frameRect.width / frameElement.offsetWidth
  const scaleY = frameRect.height / frameElement.offsetHeight
  if (!scaleX || !scaleY) return null

  const toLogicalRect = (element: HTMLElement): PageFrameChildDragRect => {
    const rect = element.getBoundingClientRect()
    return {
      id: element.dataset.pageFrameChildId || '',
      l: (rect.left - frameRect.left) / scaleX,
      t: (rect.top - frameRect.top) / scaleY,
      w: rect.width / scaleX,
      h: rect.height / scaleY,
    }
  }

  const movingRect = { ...toLogicalRect(sourceElement), id: childId }
  const targets = Array.from(
    frameElement.querySelectorAll<HTMLElement>('[data-page-frame-child-id]'),
  )
    .filter((element) => {
      if (element === sourceElement) return false
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
    .map(toLogicalRect)
    .filter((rect) => rect.id && rect.w > 0 && rect.h > 0)

  return {
    movingRect,
    targets,
    canvas: { width: frameElement.offsetWidth, height: frameElement.offsetHeight },
  }
}

/** 图标只移动自身，矩形不能取整项菜单的尺寸，否则图标会显得拖动范围过大。 */
const collectMenuIconGeometry = (event: MouseEvent, childId: string) => {
  const sourceElement = event.currentTarget as HTMLElement | null
  const frameElement = sourceElement?.closest<HTMLElement>('[data-page-frame="true"]')
  if (!sourceElement || !frameElement || !frameElement.offsetWidth || !frameElement.offsetHeight) {
    return null
  }

  const frameRect = frameElement.getBoundingClientRect()
  const scaleX = frameRect.width / frameElement.offsetWidth
  const scaleY = frameRect.height / frameElement.offsetHeight
  if (!scaleX || !scaleY) return null

  const toLogicalRect = (element: HTMLElement): PageFrameChildDragRect => {
    const rect = element.getBoundingClientRect()
    return {
      id: element.dataset.pageFrameChildId || '',
      l: (rect.left - frameRect.left) / scaleX,
      t: (rect.top - frameRect.top) / scaleY,
      w: rect.width / scaleX,
      h: rect.height / scaleY,
    }
  }

  const movingRect = { ...toLogicalRect(sourceElement), id: childId }
  const targets = Array.from(
    frameElement.querySelectorAll<HTMLElement>('[data-page-frame-child-id]'),
  )
    .filter((element) => {
      if (
        element === sourceElement ||
        element.contains(sourceElement) ||
        sourceElement.contains(element)
      ) {
        return false
      }
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
    .map(toLogicalRect)
    .filter((rect) => rect.id && rect.w > 0 && rect.h > 0)

  return {
    movingRect,
    targets,
    canvas: { width: frameElement.offsetWidth, height: frameElement.offsetHeight },
  }
}

const startPositionableChildDrag = (
  event: MouseEvent,
  child: PageFramePositionableChild & { id: string; locked: boolean },
) => {
  if (!isEditing()) return
  selectChild(event, child.id)
  const geometry = collectChildDragGeometry(event, child.id)
  if (!child.locked && geometry) emit('dragChild', { childId: child.id, event, ...geometry })
}
const startMenuChildDrag = (event: MouseEvent, childId: string) => {
  if (!isEditing()) return
  const child = frame.value.menuChildren.find((item) => item.id === childId)
  if (!child) return
  event.preventDefault()
  event.stopPropagation()
  emit('selectChild', child.id)
  const geometry = collectChildDragGeometry(event, child.id)
  if (!child.locked && geometry) emit('dragChild', { childId: child.id, event, ...geometry })
}
const startMenuChildResize = (
  event: MouseEvent,
  childId: string,
  handle: PageFrameResizeHandle,
) => {
  if (!isEditing()) return
  const child = frame.value.menuChildren.find((item) => item.id === childId)
  if (!child) return
  event.preventDefault()
  event.stopPropagation()
  emit('selectChild', child.id)
  const geometry = collectChildDragGeometry(event, child.id)
  if (!child.locked && geometry)
    emit('resizeChild', { childId: child.id, handle, event, ...geometry })
}
const startMenuIconDrag = (event: MouseEvent, childId: string, active: boolean) => {
  if (!isEditing()) return
  const child = frame.value.menuChildren.find((item) => item.id === childId)
  if (!child) return
  event.preventDefault()
  event.stopPropagation()
  emit('selectChild', child.id)
  const geometry = collectMenuIconGeometry(event, child.id)
  if (!child.locked && geometry) emit('dragIcon', { childId, active, event, ...geometry })
}
const startMenuIconResize = (
  event: MouseEvent,
  childId: string,
  handle: PageFrameResizeHandle,
  active: boolean,
) => {
  if (!isEditing()) return
  const child = frame.value.menuChildren.find((item) => item.id === childId)
  if (!child) return
  event.preventDefault()
  event.stopPropagation()
  emit('selectChild', child.id)
  const geometry = collectMenuIconGeometry(event, child.id)
  if (!child.locked && geometry) emit('resizeIcon', { childId, active, handle, event, ...geometry })
}
const toggleRootMenu = (rootId: string) => {
  expandedRootId.value = expandedRootId.value === rootId ? '' : rootId
  expandedChildId.value = ''
}
const setActiveMenu = (menuId: string) => {
  if (activeMenuId.value === menuId) return
  activeMenuId.value = menuId
  widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', menuId)
}
const handleNodeClick = (node: PageMenuNode, rootId = node.id) => {
  if (isEditing()) return
  setActiveMenu(node.id)
  if (node.children.length) {
    if (rootId === node.id) toggleRootMenu(node.id)
    else expandedChildId.value = expandedChildId.value === node.id ? '' : node.id
    return
  }
  expandedRootId.value = ''
  expandedChildId.value = ''
  const targetUrl = node.pageUrl.trim()
  if (targetUrl && typeof window !== 'undefined')
    window.open(targetUrl, node.openInNewWindow ? '_blank' : '_self')
}
/** 递归收集当前可见菜单编号，兼容一级、二级和三级菜单的运行态恢复。 */
const collectVisibleMenuIds = () => {
  const ids = new Set<string>()
  const stack: PageMenuNode[] = [...visibleMenus.value]
  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    ids.add(node.id)
    stack.push(...node.children)
  }
  return ids
}

/**
 * 默认菜单只负责“首次没有运行态值”时的兜底。
 *
 * 页面框架可能因按需追加二维组件或数据回填而被局部重新挂载；如果每次挂载都重新应用
 * defaultMenuId，用户刚点击的菜单就会回到首页。菜单点击已经把当前编号写入运行时值表，
 * 因此这里优先恢复仍然存在的当前菜单，只有当前菜单已被数据源移除时才回退到默认项。
 */
const applyDefaultMenu = (defaultMenuId: string) => {
  const visibleMenuIds = collectVisibleMenuIds()
  const runtimeMenuId = widgetRuntimeValueContext.getRuntimeValue(props.widgetId, 'value')
  const persistedMenuId = typeof runtimeMenuId === 'string' ? runtimeMenuId.trim() : ''
  const currentMenuId = activeMenuId.value || persistedMenuId
  const nextMenuId = visibleMenuIds.has(currentMenuId)
    ? currentMenuId
    : visibleMenuIds.has(defaultMenuId)
      ? defaultMenuId
      : ''
  setActiveMenu(nextMenuId)
}
watch(
  () => frame.value.defaultMenuId,
  (defaultMenuId) => applyDefaultMenu(defaultMenuId),
  { immediate: true },
)
watch(
  visibleMenus,
  () => {
    const ids = collectVisibleMenuIds()
    if (!ids.has(activeMenuId.value)) {
      const defaultMenuId = frame.value.defaultMenuId
      applyDefaultMenu(defaultMenuId)
    }
    if (!ids.has(expandedRootId.value)) expandedRootId.value = ''
    if (!ids.has(expandedChildId.value)) expandedChildId.value = ''
  },
  { deep: true, immediate: true },
)
watch(
  tcmMenuResourceSignature,
  () => {
    if (props.option.layout === 'tcm-bottom') void hydrateTcmMenuIconResources(props.option)
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.page-frame {
  position: relative;
  width: 100%;
  height: 100%;
  container-name: page-frame;
  container-type: size;
  overflow: visible;
  color: #ecfff8;
  pointer-events: none;
  background: transparent;
}
.page-frame__background {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: '';
  background-image: var(--page-frame-background-image);
  background-repeat: no-repeat;
  background-position: top center;
  background-size: 100% 100%;
  opacity: var(--page-frame-background-opacity);
}
.page-frame--factory-bottom .page-frame__background {
  background-image: var(--page-frame-background-image);
  background-position: center;
  background-size: 100% 100%;
}
.page-frame--tcm-bottom .page-frame__background {
  /* 中医馆图片只作为最外层透明外框，中心透明区域继续透出地图或页面内容。 */
  z-index: 0;
  background-position: center;
  background-size: 100% 100%;
}
.page-frame__topbar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 13fr 23fr 28fr 20fr 7fr 7fr 8fr;
  align-items: center;
  width: 100%;
  height: clamp(64px, 7cqh, 108px);
  padding: 8px clamp(8px, 1.25cqw, 24px) 14px;
  pointer-events: none;
}
.page-frame__slot {
  min-width: 0;
  pointer-events: auto;
}
.page-frame__slot.is-hidden {
  visibility: hidden;
  pointer-events: none;
}
button.page-frame__slot {
  appearance: none;
  cursor: default;
  background: transparent;
  border: 0;
}
.page-frame__slot.is-editing {
  cursor: pointer;
}
.page-frame__slot.is-editing:hover,
.page-frame__slot.is-selected {
  outline: 1px dashed rgb(163 255 220 / 72%);
  outline-offset: 3px;
  background: rgb(83 210 153 / 8%);
}
.page-frame__logo {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
  padding: 0 12px;
  white-space: nowrap;
}
.page-frame__logo img,
.page-frame__weather img,
.page-frame__weather-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.page-frame__menus {
  display: flex;
  gap: var(--page-frame-menu-gap, clamp(4px, 0.55cqw, 10px));
  align-items: center;
  min-width: 0;
  min-height: 42px;
}
.page-frame__menus--left {
  justify-content: flex-start;
  padding-right: 14px;
}
.page-frame__menus--right {
  justify-content: flex-start;
  padding-left: 14px;
}
.page-frame__title {
  position: absolute;
  top: 8px;
  bottom: 14px;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 26.415%;
  padding: 0 24px;
  overflow: hidden;
  line-height: 1.1;
  text-align: center;
  text-shadow: 0 2px 12px rgb(0 35 20 / 72%);
  transform: translateX(-50%);
}
.page-frame__title strong,
.page-frame__title small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-frame__title small {
  margin-top: 5px;
  letter-spacing: 0.12em;
}
.page-frame__weather {
  display: grid;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: auto auto;
  gap: 0 7px;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1.25;
}
.page-frame__weather img,
.page-frame__weather-icon {
  grid-row: 1 / 3;
}
.page-frame__weather-main {
  font-size: 1.15em;
  font-weight: 700;
}
.page-frame__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  line-height: 1.35;
  white-space: nowrap;
}
.page-frame__time time:last-child {
  opacity: 0.7;
}
.page-frame__account {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}
.page-frame__avatar {
  display: grid;
  flex: 0 0 32px;
  place-items: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  color: #0a3d2a;
  background: #c9ffe7;
  border: 1px solid rgb(226 255 242 / 70%);
  border-radius: 50%;
}
.page-frame__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.page-frame__account-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.page-frame__account-copy strong,
.page-frame__account-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-frame__account-copy small {
  margin-top: 2px;
  font-size: 0.78em;
  opacity: 0.62;
}
.page-frame--showroom-top .page-frame__topbar {
  display: block;
  height: 5.74cqh;
  min-height: 44px;
  padding: 0;
}
.page-frame--showroom-top .page-frame__logo,
.page-frame--showroom-top .page-frame__menus,
.page-frame--showroom-top .page-frame__time,
.page-frame--showroom-top .page-frame__weather,
.page-frame--showroom-top .page-frame__account {
  position: absolute;
}
.page-frame--showroom-top .page-frame__logo {
  top: 1.296cqh;
  left: 0.833cqw;
  gap: 5px;
  height: 34px;
  padding: 0;
  white-space: nowrap;
}
.page-frame--showroom-top .page-frame__logo img {
  width: 26px;
  height: 34px;
}
.page-frame--showroom-top .page-frame__logo span {
  color: transparent;
  background: linear-gradient(180deg, #fff0c5 0%, #e4b873 100%);
  background-clip: text;
}
.page-frame--showroom-top .page-frame__menus {
  top: 1.019cqh;
  left: 31.667cqw;
  gap: var(--page-frame-menu-gap, 4.531cqw);
  width: max-content;
  min-height: 37px;
  padding: 0;
}
.page-frame--showroom-top .page-frame__menus--right {
  display: none;
}
.page-frame--showroom-top :deep(.page-frame-menu) {
  width: max-content;
  max-width: none;
}
.page-frame--showroom-top :deep(.page-frame-menu__head) {
  height: 37px;
  color: #d5d2c8;
  background: transparent;
  border: 0;
}
.page-frame--showroom-top :deep(.page-frame-menu__trigger) {
  padding: 0;
  line-height: 23px;
  letter-spacing: 0;
  text-shadow: 0 1px 3px rgb(0 27 26 / 70%);
}
.page-frame--showroom-top :deep(.page-frame-menu__head.is-active),
.page-frame--showroom-top :deep(.page-frame-menu__head.is-expanded),
.page-frame--showroom-top :deep(.page-frame-menu__head:hover) {
  color: #f7d99f;
  background: transparent;
}
.page-frame--showroom-top :deep(.page-frame-menu__icon-box) {
  position: absolute;
  top: 8px;
  left: 50%;
  width: max-content;
  height: 37px;
}
.page-frame--showroom-top :deep(.page-frame-menu__icon) {
  width: auto;
  max-width: 80px;
  height: auto;
  max-height: 37px;
}
.page-frame--showroom-top :deep(.page-frame-menu__label) {
  /* 菜单图片已包含文字；保留文字占位和可访问名称，避免五项菜单位置随图片宽度变化。 */
  opacity: 0;
}
.page-frame--showroom-top :deep(.page-frame-menu__dropdown) {
  background: rgb(5 48 46 / 96%);
  border-color: rgb(238 201 137 / 58%);
}
.page-frame--showroom-top .page-frame__time {
  top: 1.759cqh;
  right: 10.94cqw;
  flex-direction: row;
  gap: 4px;
  height: 24px;
  padding: 0;
  line-height: 20px;
}
.page-frame--showroom-top .page-frame__time time:last-child {
  opacity: 1;
}
.page-frame--showroom-top .page-frame__weather {
  top: 1.759cqh;
  right: 7.083cqw;
  display: flex;
  gap: 4px;
  height: 24px;
  padding: 0;
  line-height: 20px;
}
.page-frame--showroom-top .page-frame__weather img {
  width: 24px;
  height: 24px;
}
.page-frame--showroom-top .page-frame__weather-main {
  font-size: 1em;
  font-weight: 500;
}
.page-frame--showroom-top .page-frame__account {
  top: 1.481cqh;
  right: 0.833cqw;
  gap: 8px;
  height: 30px;
  padding: 0;
}
.page-frame--showroom-top .page-frame__account::before {
  position: absolute;
  top: 9px;
  left: -16px;
  width: 1px;
  height: 12px;
  content: '';
  background: rgb(232 220 192 / 48%);
}
.page-frame--showroom-top .page-frame__account::after {
  width: 6px;
  height: 6px;
  margin-left: -3px;
  content: '';
  border-right: 1px solid currentcolor;
  border-bottom: 1px solid currentcolor;
  transform: translateY(-2px) rotate(45deg);
}
.page-frame--showroom-top .page-frame__avatar {
  flex-basis: 30px;
  width: 30px;
  height: 30px;
  background: transparent;
  border: 0;
}
.page-frame--showroom-top .page-frame__account-copy small {
  display: none;
}
.page-frame--factory-bottom .page-frame__topbar {
  position: relative;
  display: block;
  height: 100%;
  padding: 0;
}
.page-frame--factory-bottom .page-frame__title {
  top: clamp(26px, 2.8cqh, 34px);
  bottom: auto;
  width: min(34%, 650px);
  height: clamp(48px, 5cqh, 58px);
  padding: 0 42px;
}
.page-frame--factory-bottom .page-frame__logo,
.page-frame--factory-bottom .page-frame__weather,
.page-frame--factory-bottom .page-frame__time,
.page-frame--factory-bottom .page-frame__account {
  position: absolute;
  top: clamp(28px, 3cqh, 36px);
  min-height: 34px;
}
.page-frame--factory-bottom .page-frame__logo {
  left: clamp(18px, 2cqw, 38px);
  padding: 0;
}
.page-frame--factory-bottom .page-frame__weather {
  right: clamp(120px, 8.6cqw, 180px);
}
.page-frame--factory-bottom .page-frame__time {
  right: clamp(220px, 13cqw, 270px);
  flex-direction: row;
  gap: 6px;
}
.page-frame--factory-bottom .page-frame__time time:last-child {
  opacity: 1;
}
.page-frame--factory-bottom .page-frame__account {
  right: clamp(18px, 2cqw, 38px);
}
.page-frame--factory-bottom .page-frame__account-copy small {
  display: none;
}
.page-frame--factory-bottom .page-frame__menus {
  position: absolute;
  bottom: clamp(38px, 3.8cqh, 46px);
  z-index: 2;
  width: max-content;
  min-height: clamp(58px, 7cqh, 76px);
  padding: 0 6px;
}
.page-frame--factory-bottom .page-frame__menus--left {
  left: 50%;
  justify-content: flex-end;
}
.page-frame--factory-bottom .page-frame__menus--right {
  left: 50%;
  justify-content: flex-start;
}
.page-frame--factory-bottom :deep(.page-frame-menu) {
  width: clamp(64px, 4.4cqw, 84px);
  max-width: 84px;
}
.page-frame--factory-bottom :deep(.page-frame-menu__head) {
  height: clamp(54px, 6.6cqh, 72px);
  overflow: visible;
  color: rgb(185 229 244 / 78%);
  border: 0;
}
.page-frame--factory-bottom :deep(.page-frame-menu__head::before) {
  position: absolute;
  top: 5px;
  left: 50%;
  width: clamp(28px, 1.9cqw, 36px);
  height: clamp(28px, 1.9cqw, 36px);
  pointer-events: none;
  content: '';
  background:
    radial-gradient(circle, rgb(139 230 255 / 76%) 0 10%, transparent 12%),
    linear-gradient(
      90deg,
      transparent 18%,
      rgb(100 211 247 / 62%) 20% 23%,
      transparent 25% 75%,
      rgb(100 211 247 / 62%) 77% 80%,
      transparent 82%
    ),
    linear-gradient(
      transparent 18%,
      rgb(100 211 247 / 62%) 20% 23%,
      transparent 25% 75%,
      rgb(100 211 247 / 62%) 77% 80%,
      transparent 82%
    );
  border: 1px solid rgb(96 205 241 / 58%);
  border-radius: 50%;
  box-shadow: inset 0 0 8px rgb(60 183 231 / 24%);
  transform: translateX(-50%);
}
.page-frame--factory-bottom :deep(.page-frame-menu__head.has-icon::before) {
  display: none;
}
.page-frame--factory-bottom :deep(.page-frame-menu__head::after) {
  position: absolute;
  bottom: 1px;
  left: 50%;
  width: 0;
  height: 1px;
  pointer-events: none;
  content: '';
  background: #7ce7ff;
  box-shadow: 0 0 8px rgb(86 217 255 / 76%);
  transform: translateX(-50%);
  transition: width 140ms ease;
}
.page-frame--factory-bottom :deep(.page-frame-menu__trigger) {
  flex-direction: column;
  gap: 0;
  align-items: center;
  justify-content: flex-end;
  padding: 0 5px 3px;
  font-size: 0.92em;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 6px rgb(0 32 52 / 82%);
}
.page-frame--factory-bottom :deep(.page-frame-menu__icon) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.page-frame--factory-bottom :deep(.page-frame-menu__icon-box) {
  width: 66px;
  height: 52px;
}
.page-frame--factory-bottom :deep(.page-frame-menu__label) {
  display: block;
  line-height: 1.2;
}
.page-frame--factory-bottom :deep(.page-frame-menu__head.is-active) {
  color: #bdefff;
  background: radial-gradient(ellipse at bottom, rgb(39 166 222 / 20%), transparent 72%);
  border: 0;
  box-shadow: none;
}
.page-frame--factory-bottom :deep(.page-frame-menu__head.is-active::before) {
  background:
    radial-gradient(circle, #e4fbff 0 14%, transparent 17%),
    linear-gradient(
      90deg,
      transparent 17%,
      #8ee9ff 19% 23%,
      transparent 25% 75%,
      #8ee9ff 77% 81%,
      transparent 83%
    ),
    linear-gradient(
      transparent 17%,
      #8ee9ff 19% 23%,
      transparent 25% 75%,
      #8ee9ff 77% 81%,
      transparent 83%
    );
  border-color: #a7efff;
  box-shadow:
    0 0 12px rgb(83 210 255 / 68%),
    inset 0 0 8px rgb(102 222 255 / 38%);
}
.page-frame--factory-bottom :deep(.page-frame-menu__head.is-active::after) {
  width: 54%;
}
.page-frame--factory-bottom :deep(.page-frame-menu__dropdown) {
  top: auto;
  bottom: calc(100% + 8px);
  background: rgb(2 25 48 / 96%);
  border-color: rgb(75 202 255 / 58%);
}
.page-frame--factory-bottom :deep(.page-frame-menu__dropdown--third) {
  top: auto;
  bottom: -5px;
}
.page-frame--tcm-bottom .page-frame__topbar {
  position: relative;
  display: block;
  height: 100%;
  padding: 0;
}
.page-frame--tcm-bottom .page-frame__title {
  top: 50%;
  bottom: auto;
  height: 52px;
}
.page-frame--tcm-bottom .page-frame__logo,
.page-frame--tcm-bottom .page-frame__weather,
.page-frame--tcm-bottom .page-frame__time,
.page-frame--tcm-bottom .page-frame__account {
  position: absolute;
  top: clamp(28px, 3cqh, 44px);
  min-height: 34px;
}
.page-frame--tcm-bottom .page-frame__logo {
  left: clamp(40px, 2.65cqw, 54px);
  padding: 0;
}
.page-frame--tcm-bottom .page-frame__weather {
  right: clamp(150px, 8.6cqw, 180px);
}
.page-frame--tcm-bottom .page-frame__time {
  right: clamp(250px, 13cqw, 270px);
  flex-direction: row;
  gap: 6px;
}
.page-frame--tcm-bottom .page-frame__time time:last-child {
  opacity: 1;
}
.page-frame--tcm-bottom .page-frame__account {
  right: clamp(40px, 2.65cqw, 54px);
}
.page-frame--tcm-bottom .page-frame__account-copy small {
  display: none;
}
.page-frame--tcm-bottom .page-frame__menus {
  position: absolute;
  bottom: clamp(44px, 5cqh, 54px);
  left: 50%;
  z-index: 2;
  gap: var(--page-frame-menu-gap, 24px);
  width: max-content;
  min-height: 38px;
  padding: 0;
}
.page-frame--tcm-bottom .page-frame__menus--left {
  justify-content: flex-end;
}
.page-frame--tcm-bottom .page-frame__menus--right {
  display: flex;
  justify-content: flex-start;
}
.page-frame--tcm-bottom :deep(.page-frame-menu) {
  width: clamp(108px, 7.08cqw, 136px);
  max-width: none;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head) {
  height: clamp(32px, 3.52cqh, 38px);
  overflow: visible;
  color: #8f9993;
  background: transparent;
  border: 0;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head::before),
.page-frame--tcm-bottom :deep(.page-frame-menu__head::after),
.page-frame--tcm-bottom :deep(.page-frame-menu__trigger::before) {
  display: none;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__trigger) {
  gap: 8px;
  justify-content: center;
  padding: 7px 22px;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0;
  text-shadow: none;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__icon-box) {
  /* 默认直接使用移除前 CSS 多边形的最大尺寸，图标资源只负责填充这个框。 */
  width: 36px;
  height: 36px;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__icon) {
  width: 100%;
  height: 100%;
  mix-blend-mode: screen;
  opacity: 0.7;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head.is-active .page-frame-menu__icon) {
  opacity: 1;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__label) {
  display: block;
  line-height: 24px;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head.is-active) {
  color: transparent;
  background: transparent;
  box-shadow: none;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head:hover),
.page-frame--tcm-bottom :deep(.page-frame-menu__head.is-expanded) {
  color: #f3ebdf;
  background: transparent;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__head.is-active .page-frame-menu__label) {
  color: transparent;
  background: linear-gradient(180deg, #f3ebdf 0%, #f8d69c 100%);
  background-clip: text;
}
.page-frame--tcm-bottom :deep(.page-frame-menu__dropdown) {
  top: auto;
  bottom: calc(100% + 8px);
  background: rgb(31 46 45 / 96%);
  border-color: rgb(204 189 141 / 58%);
}
.page-frame--tcm-bottom :deep(.page-frame-menu__dropdown--third) {
  top: auto;
  bottom: -5px;
}
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 插值后的构建产物是浏览器标准 @container。 */
@#{'container'} page-frame (max-width: 1200px) {
  .page-frame__topbar {
    grid-template-columns: 11fr 22fr 31fr 20fr 7fr 7fr 8fr;
  }
  .page-frame__title {
    width: 29.245%;
  }
  .page-frame__logo span,
  .page-frame__account-copy small,
  .page-frame__time time:last-child {
    display: none;
  }
}
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 插值后的构建产物是浏览器标准 @container。 */
@#{'container'} page-frame (max-width: 760px) {
  .page-frame__topbar {
    grid-template-columns: 9fr 23fr 32fr 23fr 7fr 7fr 6fr;
  }
  .page-frame__title {
    width: 29.907%;
    padding-inline: 8px;
  }
  .page-frame__account-copy {
    display: none;
  }
  .page-frame__menus--left {
    padding-right: 6px;
  }
  .page-frame__menus--right {
    padding-left: 6px;
  }
}
</style>
