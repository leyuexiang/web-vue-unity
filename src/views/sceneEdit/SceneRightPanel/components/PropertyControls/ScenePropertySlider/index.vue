<template>
  <!--
    右侧属性面板唯一的连续数值控件入口。范围、步长、提示框和 input/change 回调均由调用方透传，
    组件只给滑块挂载共享样式类并转发 v-model，避免每个面板重复处理绿色进度和手柄尺寸。
  -->
  <el-slider
    class="scene-edit-property-slider"
    :model-value="modelValue"
    v-bind="$attrs"
    @update:model-value="handleModelValueUpdate"
  />
</template>

<script setup lang="ts">
defineOptions({
  /** 属性和值监听器由内部 Element Plus 控件承接，避免在包装组件根节点重复绑定。 */
  inheritAttrs: false,
})

defineProps<{
  /**
   * 同时兼容单值和范围滑块，保持 Element Plus 的原有数据契约；
   * 未初始化的历史配置允许 undefined，避免仅为样式迁移而改变字段默认值。
   */
  modelValue?: number | number[]
}>()

const emit = defineEmits<{
  /** 仅透传 v-model；业务 input/change 事件继续由各属性面板明确持有。 */
  'update:modelValue': [value: number | number[]]
}>()

/**
 * 只同步数值，不在共享层节流或提交 SceneStore，
 * 防止天气面板已有的防抖和 CommandBus 写入策略被意外改变。
 */
const handleModelValueUpdate = (value: number | number[]) => {
  emit('update:modelValue', value)
}
</script>
