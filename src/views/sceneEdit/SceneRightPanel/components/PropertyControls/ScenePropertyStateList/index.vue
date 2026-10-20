<template>
  <!--
    状态/事件列表共享外壳。
    列表只负责宽度和纵向间距，具体行内容由 ScenePropertyStateRow 提供，
    这样状态页签和事件页签可以复用同一套结构而不耦合数据模型。
  -->
  <div
    class="scene-edit-property-state-list"
    :class="[attrs.class, { 'scene-edit-property-state-list--flat': variant === 'flat' }]"
    :style="rootStyle"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'

defineOptions({
  /** 列表外壳自行接管 class/style，保证可变宽度只作用于共享根节点。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
const rootStyle = computed<StyleValue | undefined>(() => attrs.style as StyleValue | undefined)

withDefaults(
  defineProps<{
    /**
     * card 保留事件面板原有的状态点卡片；flat 对应 Figma 状态页的无底色平面列表。
     * 变体仅改变共享列表的展示，不接管状态数据或业务命令。
     */
    variant?: 'card' | 'flat'
  }>(),
  {
    variant: 'card',
  },
)
</script>
