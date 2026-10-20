<template>
  <!--
    右侧属性面板折叠容器共享入口。
    组件只负责承接 Element Plus 的折叠状态、事件和子项插槽，不读取场景状态，
    从而让图表、动画和后续属性分组共用同一套 Figma 标题、箭头和宽度基线。
  -->
  <el-collapse
    v-bind="controlAttrs"
    v-model="model"
    :class="['scene-edit-property-collapse', attrs.class]"
    :style="attrs.style"
  >
    <slot />
  </el-collapse>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { CollapseModelValue } from 'element-plus'

defineOptions({
  /** 共享组件自行接管 class/style，避免布局属性被错误地继承到外层节点。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
/** 折叠状态沿用 Element Plus 的字符串、数字或数组模型，不改变调用方的状态语义。 */
const model = defineModel<CollapseModelValue>()

/** 仅移除 class/style，其余属性和 change、before-collapse 等事件继续透传。 */
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
