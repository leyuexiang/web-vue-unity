<template>
  <div
    class="page-frame-menu"
    :class="[`page-frame-menu--${side}`, { 'is-selected': selected }]"
    :style="branchStyle"
    :data-page-frame-child-id="root.id"
    @mousedown="emit('selectChild', $event)"
  >
    <div
      class="page-frame-menu__head"
      :class="{
        'is-active': isActive,
        'is-expanded': expandedRootId === root.id,
        'has-icon': Boolean(menuIcon),
      }"
    >
      <button type="button" class="page-frame-menu__trigger" @click="emitNodeClick(root, root.id)">
        <span
          v-if="menuIcon"
          class="page-frame-menu__icon-box"
          :style="menuIconBoxStyle"
          @mousedown.stop="emit('iconDragStart', $event, isActive)"
        >
          <img class="page-frame-menu__icon" :src="menuIcon" alt="" aria-hidden="true" />
          <span
            v-if="selected && isTcmBottom"
            class="page-frame-menu__icon-resize-overlay"
            aria-hidden="true"
          >
            <span
              v-for="handle in PAGE_FRAME_RESIZE_HANDLES"
              :key="handle"
              class="page-frame-menu__icon-resize-handle"
              :class="`is-${handle}`"
              tabindex="-1"
              @mousedown.stop.prevent="emit('iconResize', $event, handle, isActive)"
            />
          </span>
        </span>
        <span
          v-if="hasMenuLabel(root.label)"
          class="page-frame-menu__label"
          :style="menuLabelStyle"
          >{{ root.label }}</span
        >
      </button>
      <div
        v-if="selected && !isTcmBottom"
        class="page-frame-menu__resize-overlay"
        aria-hidden="true"
      >
        <button
          v-for="handle in PAGE_FRAME_RESIZE_HANDLES"
          :key="handle"
          type="button"
          class="page-frame-menu__resize-handle"
          :class="`is-${handle}`"
          tabindex="-1"
          @mousedown.stop.prevent="emit('resizeChild', $event, handle)"
        />
      </div>
      <button
        v-if="root.children.length"
        type="button"
        class="page-frame-menu__toggle"
        :class="{ 'is-expanded': expandedRootId === root.id }"
        :aria-label="`${expandedRootId === root.id ? '收起' : '展开'}${hasMenuLabel(root.label) ? root.label : '菜单'}下级菜单`"
        :aria-expanded="expandedRootId === root.id"
        data-page-frame-menu-toggle="true"
        @mousedown.stop
        @click.stop="emit('toggleRoot', root.id)"
      >
        <i aria-hidden="true"></i>
      </button>
    </div>
    <div
      v-if="expandedRootId === root.id && root.children.length"
      class="page-frame-menu__dropdown"
    >
      <div v-for="child in root.children" :key="child.id" class="page-frame-menu__row">
        <button
          type="button"
          class="page-frame-menu__nested"
          :class="{ 'is-active': activeMenuId === child.id }"
          @click.stop="emitNodeClick(child, root.id)"
        >
          <span v-if="hasMenuLabel(child.label)">{{ child.label }}</span>
          <i v-if="child.children.length" aria-hidden="true"></i>
        </button>
        <div
          v-if="expandedChildId === child.id && child.children.length"
          class="page-frame-menu__dropdown page-frame-menu__dropdown--third"
        >
          <button
            v-for="grandchild in child.children"
            :key="grandchild.id"
            type="button"
            class="page-frame-menu__nested"
            :class="{ 'is-active': activeMenuId === grandchild.id }"
            @click.stop="emitNodeClick(grandchild, root.id)"
          >
            <template v-if="hasMenuLabel(grandchild.label)">{{ grandchild.label }}</template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import {
  getPageFrameMenuIcon,
  PAGE_FRAME_RESIZE_HANDLES,
  type PageFrameMenuChild,
  type PageFrameResizeHandle,
} from './pageFrameTypes'
import type { PageMenuNode } from './menuTree'
defineOptions({ name: 'VPageMenuBranch' })
const emit = defineEmits<{
  nodeClick: [node: PageMenuNode, rootId: string]
  selectChild: [event: MouseEvent]
  iconDragStart: [event: MouseEvent, active: boolean]
  iconResize: [event: MouseEvent, handle: PageFrameResizeHandle, active: boolean]
  resizeChild: [event: MouseEvent, handle: PageFrameResizeHandle]
  toggleRoot: [rootId: string]
}>()
const props = defineProps<{
  root: PageFrameMenuChild
  side: 'left' | 'right'
  activeMenuId: string
  expandedRootId: string
  expandedChildId: string
  selected?: boolean
  isTcmBottom?: boolean
  isShowroomTop?: boolean
}>()
const isActive = computed(() => props.activeMenuId === props.root.id || props.selected)
const menuIcon = computed(() => getPageFrameMenuIcon(props.root, isActive.value))
const hasMenuLabel = (label: string) => label.trim().length > 0
const menuVisualStyle = (offsetX: number, offsetY: number, scale: number) => ({
  transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
  transformOrigin: 'center center',
})
const menuLabelStyle = computed(() =>
  menuVisualStyle(props.root.labelOffsetX, props.root.labelOffsetY, props.root.labelScale),
)
const menuIconScale = computed(() =>
  isActive.value ? (props.root.activeIconScale ?? props.root.iconScale) : props.root.iconScale,
)
const menuIconStyle = computed(() =>
  props.isShowroomTop
    ? {
        transform: [
          `translate(calc(-50% + ${props.root.iconOffsetX}px), ${props.root.iconOffsetY}px)`,
          `scale(${menuIconScale.value})`,
        ].join(' '),
        transformOrigin: 'center center',
      }
    : menuVisualStyle(props.root.iconOffsetX, props.root.iconOffsetY, menuIconScale.value),
)
const menuIconBoxStyle = computed(() => ({
  ...menuIconStyle.value,
}))
const branchStyle = computed(() => ({
  color: props.root.style.color,
  fontFamily: props.root.style.fontFamily,
  fontSize: `${props.root.style.fontSize}px`,
  fontWeight: props.root.style.fontWeight,
  transform: `translate(${props.root.offsetX}px, ${props.root.offsetY}px) scale(${props.root.scale})`,
  transformOrigin: 'center center',
}))
const emitNodeClick = (node: PageMenuNode, rootId: string) => emit('nodeClick', node, rootId)
</script>
<style scoped lang="scss">
.page-frame-menu {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 112px;
}
.page-frame-menu.is-selected {
  outline: 1px dashed rgb(163 255 220 / 72%);
  outline-offset: 3px;
}
.page-frame-menu__resize-overlay {
  position: absolute;
  inset: -7px;
  z-index: 50;
  pointer-events: none;
  border: 1px dashed rgb(163 255 220 / 88%);
}
.page-frame-menu__resize-handle {
  position: absolute;
  z-index: 1;
  width: 8px;
  height: 8px;
  padding: 0;
  pointer-events: auto;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid rgb(40 117 91 / 95%);
  border-radius: 2px;
}
.page-frame-menu__resize-handle.is-l,
.page-frame-menu__resize-handle.is-r {
  top: 50%;
  transform: translateY(-50%);
}
.page-frame-menu__resize-handle.is-l {
  left: -5px;
  cursor: ew-resize;
}
.page-frame-menu__resize-handle.is-r {
  right: -5px;
  cursor: ew-resize;
}
.page-frame-menu__resize-handle.is-t,
.page-frame-menu__resize-handle.is-b {
  left: 50%;
  transform: translateX(-50%);
}
.page-frame-menu__resize-handle.is-t {
  top: -5px;
  cursor: ns-resize;
}
.page-frame-menu__resize-handle.is-b {
  bottom: -5px;
  cursor: ns-resize;
}
.page-frame-menu__resize-handle.is-lt,
.page-frame-menu__resize-handle.is-lb {
  left: -5px;
  cursor: nwse-resize;
}
.page-frame-menu__resize-handle.is-rt,
.page-frame-menu__resize-handle.is-rb {
  right: -5px;
  cursor: nesw-resize;
}
.page-frame-menu__resize-handle.is-lt,
.page-frame-menu__resize-handle.is-rt {
  top: -5px;
}
.page-frame-menu__resize-handle.is-lb,
.page-frame-menu__resize-handle.is-rb {
  bottom: -5px;
}
.page-frame-menu__head {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 34px;
  overflow: visible;
  border-bottom: 1px solid rgb(176 255 222 / 38%);
  transition:
    color 140ms ease,
    background 140ms ease;
}
.page-frame-menu__trigger,
.page-frame-menu__nested,
.page-frame-menu__toggle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 0;
}
.page-frame-menu__trigger {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 2px 0 10px;
  overflow: visible;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 1px 8px rgb(0 43 24 / 80%);
}
.page-frame-menu__trigger > .page-frame-menu__label {
  display: block;
  overflow: visible;
  text-overflow: clip;
}
.page-frame-menu__icon-box {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 24px;
  transform-origin: center center;
}
.page-frame-menu__icon {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.page-frame-menu__icon-resize-overlay {
  position: absolute;
  inset: -7px;
  z-index: 2;
  pointer-events: none;
  border: 1px dashed rgb(163 255 220 / 88%);
}
.page-frame-menu__icon-resize-handle {
  position: absolute;
  z-index: 1;
  width: 8px;
  height: 8px;
  padding: 0;
  pointer-events: auto;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid rgb(40 117 91 / 95%);
  border-radius: 2px;
}
.page-frame-menu__icon-resize-handle.is-l,
.page-frame-menu__icon-resize-handle.is-r {
  top: 50%;
  transform: translateY(-50%);
}
.page-frame-menu__icon-resize-handle.is-l {
  left: -5px;
  cursor: ew-resize;
}
.page-frame-menu__icon-resize-handle.is-r {
  right: -5px;
  cursor: ew-resize;
}
.page-frame-menu__icon-resize-handle.is-t,
.page-frame-menu__icon-resize-handle.is-b {
  left: 50%;
  transform: translateX(-50%);
}
.page-frame-menu__icon-resize-handle.is-t {
  top: -5px;
  cursor: ns-resize;
}
.page-frame-menu__icon-resize-handle.is-b {
  bottom: -5px;
  cursor: ns-resize;
}
.page-frame-menu__icon-resize-handle.is-lt,
.page-frame-menu__icon-resize-handle.is-lb {
  left: -5px;
  cursor: nwse-resize;
}
.page-frame-menu__icon-resize-handle.is-rt,
.page-frame-menu__icon-resize-handle.is-rb {
  right: -5px;
  cursor: nesw-resize;
}
.page-frame-menu__icon-resize-handle.is-lt,
.page-frame-menu__icon-resize-handle.is-rt {
  top: -5px;
}
.page-frame-menu__icon-resize-handle.is-lb,
.page-frame-menu__icon-resize-handle.is-rb {
  bottom: -5px;
}
.page-frame-menu__toggle {
  flex: 0 0 24px;
  align-self: stretch;
  padding: 0 7px 0 3px;
}
.page-frame-menu__head:hover,
.page-frame-menu__head.is-expanded {
  color: #ffffff;
  background-color: rgb(163 255 214 / 18%);
}
.page-frame-menu__head.is-active {
  color: #ffffff;
  background-color: rgb(77 206 119 / 34%);
}
.page-frame-menu__toggle:focus-visible {
  outline: 1px solid rgb(163 255 220 / 88%);
  outline-offset: -2px;
}
.page-frame-menu i {
  width: 6px;
  height: 6px;
  margin-left: 7px;
  border-right: 1px solid currentcolor;
  border-bottom: 1px solid currentcolor;
  transform: translateY(-2px) rotate(45deg);
}
.page-frame-menu__toggle i {
  margin-left: 0;
  transition: transform 140ms ease;
}
.page-frame-menu__toggle.is-expanded i {
  transform: translateY(2px) rotate(225deg);
}
.page-frame-menu__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 40;
  width: 164px;
  padding: 5px;
  background: rgb(5 35 25 / 96%);
  border: 1px solid rgb(114 238 177 / 54%);
  box-shadow:
    0 14px 30px rgb(0 0 0 / 38%),
    inset 0 0 18px rgb(70 210 142 / 10%);
  transform: translateX(-50%);
}
.page-frame-menu__row {
  position: relative;
}
.page-frame-menu__nested {
  justify-content: space-between;
  min-height: 34px;
  padding: 0 11px;
  font-size: 0.88em;
  border-bottom: 1px solid rgb(139 238 190 / 10%);
}
.page-frame-menu__nested:hover,
.page-frame-menu__nested.is-active {
  color: #ffffff;
  background: rgb(89 205 151 / 18%);
}
.page-frame-menu__dropdown--third {
  top: -5px;
  left: calc(100% + 8px);
  transform: none;
}
.page-frame-menu--right .page-frame-menu__dropdown--third {
  right: calc(100% + 8px);
  left: auto;
}
</style>
