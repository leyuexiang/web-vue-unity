<template>
  <div class="widget-text-common" :style="rootStyle">
    <span class="widget-text-common__content" :style="contentStyle">{{ displayValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, type CSSProperties } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'

defineOptions({ name: 'VTextCommon' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const textAlign = computed<'left' | 'center' | 'right'>(() => {
  const value = props.option.textAlign
  return value === 'left' || value === 'right' || value === 'center' ? value : 'center'
})

const rootStyle = computed(() => ({
  color: props.option.fontColor,
  fontSize: `${props.option.fontSize}px`,
  lineHeight: Number(props.option.lineHeight) > 0 ? `${props.option.lineHeight}px` : undefined,
  fontWeight: props.option.fontWeight,
  padding: `${props.option.paddingY}px ${props.option.paddingX}px`,
  textAlign: textAlign.value,
  borderWidth: `${props.option.borderWidth}px`,
  borderStyle: props.option.borderWidth ? 'solid' : 'none',
  borderColor: props.option.borderColor,
  borderRadius: `${props.option.borderRadius}px`,
  letterSpacing: `${props.option.letterSpacing}px`,
  writingMode: props.option.writingMode as 'horizontal-tb' | 'vertical-rl',
  backgroundColor: props.option.backgroundColor,
}))

const displayValue = computed(() => {
  const prefix = (props.option as Config['option'] & { prefix?: unknown }).prefix
  return `${typeof prefix === 'string' ? prefix : ''}${props.option.value ?? ''}`
})

const contentStyle = computed<CSSProperties>(() => ({
  whiteSpace: props.option.whiteSpace === 'nowrap' ? 'nowrap' : 'pre-wrap',
  overflowWrap: props.option.whiteSpace === 'nowrap' ? 'normal' : 'anywhere',
}))

watch(
  () => props.option.value,
  (newValue) => {
    /**
     * 文本部件没有独立本地状态，它的当前值直接等于配置中的展示文本。
     * 这里仍然统一上报到运行时注册表，保持规则读取入口一致。
     * 写入入口通过上下文注入，避免组件包直接依赖编辑器仓库。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
.widget-text-common {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--widget-font-family, inherit);
  user-select: none;
}
.widget-text-common__content {
  display: block;
  width: 100%;
  min-width: 0;
}
</style>
