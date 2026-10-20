<template>
  <!-- 外层 SceneRightPanel 统一负责滚动和属性留白，动画页签只输出内容。 -->
  <div
    v-if="targetWidget"
    class="scene-edit-property-content scene-edit-animation-panel text-[14px]"
  >
    <!--
      动画选择、摘要行、折叠分组和可变宽度网格全部由共享复合组件负责。
      当前面板仅把二维部件的预览、历史记录和持久化能力适配为公共事件。
    -->
    <ScenePropertyAnimationBlock
      :model-value="selectedAnimation"
      :groups="animations"
      @update:model-value="applyAnimation"
      @preview-start="previewAnimation"
      @preview-end="clearPreviewAnimation"
      @clear="clearAnimation"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import ScenePropertyAnimationBlock from '@/components/ScenePropertyAnimationBlock/index.vue'
import { animations } from '@/settings/animations'
import {
  clearWidgetPanelAnimations,
  resolveWidgetPanelSelection,
  setWidgetPanelAnimationPreview,
  setWidgetPanelAnimations,
} from '@/integrations/scene/widgetPanels'

defineOptions({ name: 'WidgetAnimationPanel' })

/**
 * 动画页签只消费二维部件能力声明。
 * 三维对象、图片、标注、打点不会进入这个面板。
 */
const targetWidget = computed(() => {
  const selection = resolveWidgetPanelSelection()
  if (selection.kind !== 'widget') return null
  return selection.capabilities.animation ? selection.widget : null
})

const selectedAnimations = computed(() => {
  const widgetAnimations = targetWidget.value?.component.styles?.animations
  return Array.isArray(widgetAnimations) ? widgetAnimations : []
})

/** 公共动画块采用单选模型；旧配置若包含多个值，仍以首项作为当前动画显示。 */
const selectedAnimation = computed(() => selectedAnimations.value[0] || '')

const clearPreviewAnimation = () => {
  setWidgetPanelAnimationPreview(null)
}

/**
 * hover 预览只写编辑器瞬时态。
 * 不保存配置、不进入历史记录，避免鼠标划过动画列表时污染场景快照。
 */
const previewAnimation = (animation: string) => {
  if (!targetWidget.value) return

  setWidgetPanelAnimationPreview({
    widgetId: targetWidget.value.id,
    animation,
  })
}

const clearAnimation = () => {
  const widget = targetWidget.value
  if (!widget) return
  clearWidgetPanelAnimations(widget.id)
}

const applyAnimation = (animation: string) => {
  const widget = targetWidget.value
  if (!widget) return
  setWidgetPanelAnimations(widget.id, [animation])
}

watch(targetWidget, (widget) => {
  if (!widget) {
    clearPreviewAnimation()
  }
})

onBeforeUnmount(() => {
  clearPreviewAnimation()
})
</script>
