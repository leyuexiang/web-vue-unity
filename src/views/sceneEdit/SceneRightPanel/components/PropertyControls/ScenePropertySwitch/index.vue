<template>
  <!--
    右侧属性面板唯一的布尔控件入口。除 v-model 外的尺寸、禁用和 change 事件全部透传，
    因此接入后仅替换视觉外壳，不会改变天气、对象或交互面板的业务写入时机。
  -->
  <el-switch
    class="scene-edit-property-switch"
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
   * 保持 Element Plus 开关原有的布尔、字符串或数字值兼容性；
   * 历史场景部分可选布尔字段尚未初始化时允许 undefined，以便保持旧对象加载行为。
   */
  modelValue?: boolean | string | number
}>()

const emit = defineEmits<{
  /** 透传 v-model，调用方原有状态归属和撤销逻辑均不迁移到共享组件。 */
  'update:modelValue': [value: boolean | string | number]
}>()

/**
 * 只向上同步开关值；@change 仍通过 $attrs 直接转发给具体面板，
 * 避免一次切换同时触发两套业务回调。
 */
const handleModelValueUpdate = (value: boolean | string | number) => {
  emit('update:modelValue', value)
}
</script>
