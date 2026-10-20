<template>
  <!--
    Figma 节点 1:885 的通用属性行：固定 65px 标签列、4px 间距和 32px 控件基线。
    组件只约束布局；具体控件、v-model 与业务事件仍由调用方通过插槽持有。
  -->
  <div class="scene-edit-property-row" :class="{ 'scene-edit-property-row--fill': controlFill }">
    <div class="scene-edit-property-row__label">
      <slot name="label">{{ label }}</slot>
    </div>
    <div class="scene-edit-property-row__control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 默认标签；需要图标或复合标签时由 label 插槽替换。 */
    label?: string
    /** 文本、数字和下拉框等标准控件是否填满标签列以外的可用宽度。 */
    controlFill?: boolean
  }>(),
  {
    label: '',
    controlFill: false,
  },
)
</script>
