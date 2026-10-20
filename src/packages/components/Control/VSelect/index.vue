<template>
  <el-select
    style="width: 100%; height: 100%"
    :style="{ fontFamily: option.fontFamily || undefined }"
    :popper-style="{ fontFamily: option.optionFontFamily || undefined }"
    placeholder="请选择"
    :options="normalizedOptions"
    v-model="displayValue"
    popper-class="scene-edit-popper"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config, { type VSelectOptionItem, type VSelectOptionValue } from './config'

/**
 * 这里必须声明成 VSelect。
 * 之前误写成 VInput，虽然多数情况下还能渲染，
 * 但会让组件身份、调试信息和潜在缓存行为都落到错误名字上。
 */
defineOptions({ name: 'VSelect' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const isSelectableValue = (value: unknown): value is VSelectOptionValue =>
  value === null || typeof value === 'string' || typeof value === 'number'

/**
 * 外部静态数据和接口数据都可能重写 options。
 * 这里统一清洗成元素增强下拉框能稳定消费的 label/value 数组，
 * 避免异常项进入渲染层，也减少模板里重复判断。
 */
const normalizedOptions = computed<VSelectOptionItem[]>(() => {
  if (!Array.isArray(props.option.options)) return []

  return props.option.options.reduce<VSelectOptionItem[]>((result, item, index) => {
    if (!item || typeof item !== 'object') return result

    const option = item as Record<string, unknown>
    if (!isSelectableValue(option.value)) return result

    result.push({
      label: String(option.label ?? option.name ?? option.value ?? `选项${index + 1}`),
      value: option.value,
    })
    return result
  }, [])
})

/**
 * 下拉选择器和输入框一样，预览态只应该维护本地交互结果：
 * - 外部配置变化时，同步当前选中项；
 * - 用户在预览里展开并切换选项时，只更新实例自身显示；
 * - 不直接回写 option，避免预览动作污染编辑配置。
 */
const innerValue = ref<VSelectOptionValue | undefined>(undefined)

const findDisplayOption = (value: VSelectOptionValue | undefined) => {
  if (value === undefined) return undefined

  const options = normalizedOptions.value
  const strictMatch = options.find((item) => item.value === value)
  if (strictMatch) return strictMatch

  /**
   * 兼容数据源常见的数字/字符串混用场景。
   * 例如 value 为数字 1，而 options 里 value 为字符串 "1"，
   * 仍然应该显示对应 label，不应该让下拉框直接显示原始值 1。
   */
  return options.find((item) => String(item.value) === String(value))
}

const displayValue = computed<VSelectOptionValue | undefined>({
  get() {
    return findDisplayOption(innerValue.value)?.value ?? innerValue.value
  },
  set(newValue) {
    innerValue.value = newValue
  },
})

watch(
  () => props.option.value,
  (newValue) => {
    innerValue.value = newValue
  },
  {
    immediate: true,
  },
)

watch(
  innerValue,
  (newValue) => {
    /**
     * 下拉选择器的规则判断值使用当前选中项。
     * 这里监听本地值而不是配置值，确保预览态切换选项后规则立刻生效。
     * 写入入口通过上下文注入，后续替换二维运行时不需要改组件包。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped>
/* 选中值从组件根继承字体；浮层通过独立样式传递，避免影响其他选择器实例。 */
:deep(.el-select__wrapper) {
  font-family: inherit;
}
</style>
