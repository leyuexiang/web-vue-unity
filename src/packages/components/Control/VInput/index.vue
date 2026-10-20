<template>
  <!-- 运行时输入控件保持原有 Element Plus 实现；共享属性控件只用于配置面板，避免改变预览态交互契约。 -->
  <el-input
    v-model="innerValue"
    style="width: 100%; height: 100%"
    :style="inputStyle"
    :placeholder="option.placeholder || '请输入'"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'
defineOptions({ name: 'VInput' })

type InputOption = Config['option'] & {
  placeholder?: string
  backgroundColor?: string
  borderColor?: string
  fontColor?: string
  fontSize?: number
  placeholderColor?: string
  borderRadius?: number
}
const props = defineProps<{ option: InputOption; widgetId?: string }>()
const inputStyle = computed<CSSProperties>(() => {
  const option = props.option
  return {
    fontFamily: option.fontFamily || undefined,
    '--widget-input-bg': option.backgroundColor || undefined,
    '--widget-input-border': option.borderColor || undefined,
    '--widget-input-color': option.fontColor || undefined,
    '--widget-input-size': option.fontSize ? `${option.fontSize}px` : undefined,
    '--widget-input-placeholder': option.placeholderColor || undefined,
    '--widget-input-radius':
      typeof option.borderRadius === 'number' ? `${option.borderRadius}px` : undefined,
  }
})
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

/**
 * 预览态的输入框应当允许临时输入，
 * 但不能把用户在预览里的输入直接写回场景配置。
 * 因此这里改成本地值承接：
 * - 编辑态基础面板改默认值时，同步到输入框；
 * - 预览态用户键入时，只改变当前实例显示。
 */
const innerValue = ref('')

watch(
  () => props.option.value,
  (newValue) => {
    innerValue.value = String(newValue ?? '')
  },
  {
    immediate: true,
  },
)

watch(
  innerValue,
  (newValue) => {
    /**
     * 输入框的运行时值取当前实例本地值。
     * 这样预览态用户键入的新内容，可以立刻参与状态和交互规则判断。
     * 写入入口通过上下文注入，避免控件组件直接依赖编辑器仓库。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped>
/* 控件填满布局框；未配置外观变量时继续使用 Element Plus 默认输入框。 */
:deep(.el-input__wrapper) {
  height: 100%;
  background-color: var(--widget-input-bg, var(--el-input-bg-color, var(--el-fill-color-blank)));
  border-radius: var(--widget-input-radius, var(--el-input-border-radius, var(--el-border-radius-base)));
  box-shadow: 0 0 0 1px var(--widget-input-border, var(--el-input-border-color, var(--el-border-color)))
    inset;
}

/* 原生输入节点需显式继承，才能同时应用于输入值和占位提示。 */
:deep(.el-input__inner) {
  font-family: inherit;
  font-size: var(--widget-input-size, inherit);
  color: var(--widget-input-color, inherit);
}
:deep(.el-input__inner::placeholder) {
  color: var(--widget-input-placeholder, var(--el-text-color-placeholder));
}
</style>
