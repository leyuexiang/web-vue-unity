<template>
  <!--
    属性面板统一下拉框入口。
    高度、底色、边框、文字和聚焦态由 propertyControls.scss 统一维护；宽度只由调用方通过
    width 属性或外部布局决定，从而同时覆盖 GIS 的宽下拉框和图表标题中的窄下拉框。
  -->
  <el-select
    v-bind="$attrs"
    class="scene-edit-property-select"
    :style="selectStyle"
    :model-value="modelValue"
    @update:model-value="handleModelValueUpdate"
  >
    <!--
      属性面板紧凑布局会隐藏部分旧字段标题，调用方可通过前缀插槽提供常驻语义。
      前缀只负责说明当前值的用途，不参与选项渲染和 v-model 更新，避免影响原有下拉交互。
    -->
    <template v-if="$slots.prefix" #prefix>
      <slot name="prefix" />
    </template>
    <slot />
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 下拉框同时服务单选和多选：标量覆盖普通属性字段，数组覆盖交互事件的多选目标。
 * 共享层只描述传递数据的形状，不解释选项业务语义，避免把事件面板的状态耦合进基础控件。
 */
type ScenePropertySelectValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | null
  | Array<string | number | boolean | Record<string, unknown>>

defineOptions({
  /** 事件和非声明属性由内部 Element Plus 下拉框承接，避免重复挂载到包装节点。 */
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 当前选中值，兼容普通单选和多选数组，保持 Element Plus 的原始数据契约。 */
    modelValue?: ScenePropertySelectValue
    /** 可选布局宽度；数字按像素处理，未传值时由共享样式填充父容器。 */
    width?: string | number
  }>(),
  {
    width: undefined,
  },
)

const emit = defineEmits<{
  /** 只透传 v-model 更新，不在共享层修改业务状态或提交命令。 */
  'update:modelValue': [value: ScenePropertySelectValue]
}>()

const selectStyle = computed(() => {
  if (props.width === undefined || props.width === null || props.width === '') {
    return undefined
  }

  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  }
})

/** 保持调用方原有 v-model 行为，避免样式抽取影响属性面板的业务逻辑。 */
const handleModelValueUpdate = (value: ScenePropertySelectValue) => {
  emit('update:modelValue', value)
}
</script>
