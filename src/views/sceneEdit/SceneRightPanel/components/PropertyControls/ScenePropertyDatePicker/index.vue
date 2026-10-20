<template>
  <!--
    右侧属性面板唯一的日期时间入口。
    日期类型、格式、值格式和禁用状态仍由调用方传入；本组件只统一控件外壳与事件透传，
    避免倒计时、日期输入等二维配置各自维护一套 Element Plus 日期样式。
  -->
  <el-date-picker
    class="scene-edit-property-date-picker"
    v-model="model"
    v-bind="$attrs"
    :teleported="teleported"
  />
</template>

<script setup lang="ts">
import type { DatePickerProps } from 'element-plus'

defineOptions({
  /** 关闭根节点属性继承，保证 class 和事件只落在内部日期控件上。 */
  name: 'ScenePropertyDatePicker',
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** 保留 Element Plus 的默认浮层挂载行为；弹层是否传送由调用方决定。 */
    teleported?: boolean
  }>(),
  {
    teleported: true,
  },
)

/** 日期组件的值可能是时间戳、日期对象、字符串或空值，不能在共享层强制转换类型。 */
const model = defineModel<DatePickerProps['modelValue']>()

/**
 * change、calendar-change、visible-change 等监听器通过 $attrs 直接落到 Element Plus 控件。
 * 不在包装层重复 emit，避免同一个业务回调因属性透传和二次上抛而执行两次。
 */
</script>
