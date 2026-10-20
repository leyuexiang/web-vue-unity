<template>
  <!--
    状态/事件行共享结构：状态点、名称和操作区固定为三列，名称列允许收缩并截断。
    状态点是只读展示，编辑/删除按钮由调用方通过 actions 插槽传入。
  -->
  <div class="scene-edit-property-state-list__row" :class="attrs.class" :style="rootStyle">
    <div v-if="showStatus" class="scene-edit-property-state-list__status">
      <slot name="status" />
    </div>
    <div class="scene-edit-property-state-list__label">
      <slot name="label" />
    </div>
    <div v-if="slots.actions" class="scene-edit-property-state-list__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots, type StyleValue } from 'vue'

defineOptions({
  /** 状态行自行接管 class/style，避免属性继续落到内部列节点。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
const slots = useSlots()
const rootStyle = computed<StyleValue | undefined>(() => attrs.style as StyleValue | undefined)

withDefaults(
  defineProps<{
    /** Figma 状态页不显示状态点；事件页默认保留状态点，用同一行组件覆盖两种语义。 */
    showStatus?: boolean
  }>(),
  {
    showStatus: true,
  },
)
</script>
