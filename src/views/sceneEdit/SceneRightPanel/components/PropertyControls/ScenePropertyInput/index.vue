<template>
  <!--
    右侧属性面板共享的文本输入控件。
    单行输入和多行文本通过 Element Plus 的 type/rows 等属性区分；组件自身只负责视觉基线、宽度和插槽透传，
    不持有场景状态，也不改变调用方的输入、失焦和提交回调。宽度默认填满属性行，窄字段通过 width 或原有 style 覆盖。
  -->
  <div
    class="scene-edit-property-input"
    :class="[attrs.class, { 'is-textarea': isTextarea, 'is-error': Boolean(errorMessage) }]"
    :style="rootStyle"
  >
    <el-input
      v-bind="controlAttrs"
      v-model="normalizedModel"
      class="scene-edit-property-input__control"
    >
      <template v-for="slotName in providedInputSlotNames" :key="slotName" #[slotName]>
        <slot :name="slotName" />
      </template>
    </el-input>
    <p v-if="errorMessage" class="scene-edit-property-input__error">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots, type StyleValue } from 'vue'

defineOptions({
  /** 关闭属性继承，避免外部 class/style 挂到包装节点后又重复传入内部输入框。 */
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 读取侧兼容业务配置中的空值；内部以未初始化状态呈现，写回值始终为字符串或数字。 */
    modelValue?: PropertyInputValue | null
    /** Vue 为自定义组件生成的 v-model 修饰符，由共享控件统一执行。 */
    modelModifiers?: PropertyInputModifiers
    /** 可选布局宽度；数字按像素处理，未传值时由共享样式填满父容器。 */
    width?: string | number
    /** 由调用方显式传入的错误说明；为空时不改变输入框垂直节奏。 */
    errorMessage?: string
  }>(),
  {
    modelValue: undefined,
    modelModifiers: () => ({}),
    width: undefined,
    errorMessage: '',
  },
)

const emit = defineEmits<{
  /** 输入控件只会写回 Element Plus 实际产生的字符串或数字，避免把未初始化状态扩散给业务回调。 */
  (event: 'update:modelValue', value: PropertyInputValue): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const inputSlotNames = ['prefix', 'suffix', 'prepend', 'append'] as const
/** 只声明调用方实际提供的插槽，避免 Element Plus 生成空的前置/后置分组节点。 */
const providedInputSlotNames = computed(() =>
  inputSlotNames.filter((slotName) => Boolean(slots[slotName])),
)

/**
 * 文本输入兼容 Element Plus 以及图表配置中的字符串、数字、空值和未初始化状态。
 * 使用有限联合类型替代 any，既允许图表百分比/数值字段保持原始类型，也让共享控件通过类型检查。
 */
type PropertyInputValue = string | number
type PropertyInputModifiers = {
  trim?: boolean
}

/**
 * 自定义组件不会自动执行调用方传入的 v-model.trim，因此在共享控件的写入边界处理修饰符。
 * 这样跳转链接、场景 URL 等旧版 el-input 字段仍会在每次写回前去除首尾空格。
 */
const normalizedModel = computed<PropertyInputValue | undefined, PropertyInputValue>({
  get: () => props.modelValue ?? undefined,
  set: (value) => {
    emit(
      'update:modelValue',
      props.modelModifiers.trim && typeof value === 'string' ? value.trim() : value,
    )
  },
})

/** 多行文本使用同一公共入口，只通过 type="textarea" 切换高度和边框样式。 */
const isTextarea = computed(() => attrs.type === 'textarea')

/**
 * 将 class/style 用于公共包装节点，使 style="width: ..." 和 width 属性真正参与外层布局，
 * 从而在右侧属性面板拖动到 300–400px 时仍保持最小宽度和剩余空间自适应。
 */
const rootStyle = computed<StyleValue | undefined>(() => {
  const width = props.width
  const widthStyle =
    width === undefined || width === null || width === ''
      ? undefined
      : { width: typeof width === 'number' ? `${width}px` : width }

  if (!widthStyle && !attrs.style) {
    return undefined
  }

  return [widthStyle, attrs.style as StyleValue]
})

/** class/style 已由共享控件消费，声明过的模型修饰符不会进入 attrs，其余属性和事件继续透传。 */
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
