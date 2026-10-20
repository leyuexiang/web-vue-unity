<template>
  <div class="widget-progress">
    <div
      class="widget-progress__track"
      role="progressbar"
      :aria-label="props.option.label || '进度'"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percentage"
      :aria-valuetext="percentageText"
      :style="trackStyle"
    >
      <div class="widget-progress__fill" :style="fillStyle"></div>
      <span
        v-if="showInsideText"
        class="widget-progress__text widget-progress__text--inside"
        :style="textStyle"
        aria-hidden="true"
        >{{ percentageText }}</span
      >
    </div>
    <span v-if="showRightText" class="widget-progress__text" :style="textStyle">
      {{ percentageText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import type { VProgressBarOption } from './config'

defineOptions({ name: 'VProgressBar' })

const props = defineProps<{
  option: VProgressBarOption
  widgetId?: string
}>()

const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

/**
 * 场景文件或外部数据可能带入非数字或越界值。
 * 渲染层统一钳制到合法百分比，避免出现负宽度或超过轨道的填充。
 */
const normalizePercentage = (value: unknown) => {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return 0
  return Math.min(Math.max(parsedValue, 0), 100)
}

/**
 * 视觉尺寸也在渲染边界内钳制；属性面板负责常规输入限制，
 * 此处保护旧场景和手工编辑配置下的布局不被异常数值破坏。
 */
const normalizeSize = (value: unknown, fallback: number, min: number, max: number) => {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return fallback
  return Math.min(Math.max(parsedValue, min), max)
}

const percentage = computed(() => {
  const option = props.option as VProgressBarOption & { value?: unknown }
  const boundValue = option.value
  const raw =
    boundValue !== undefined && boundValue !== null && boundValue !== ''
      ? boundValue
      : option.percentage
  const parsed = typeof raw === 'number' ? raw : Number(String(raw).replace(/%/g, '').trim())
  return normalizePercentage(parsed)
})
const percentageText = computed(() => String(Number(percentage.value.toFixed(1))) + '%')
const trackHeight = computed(() => normalizeSize(props.option.trackHeight, 15, 1, 120))
const borderRadius = computed(() => normalizeSize(props.option.borderRadius, 6, 0, 120))
const textSize = computed(() => normalizeSize(props.option.textSize, 14, 8, 48))
const textPosition = computed(() =>
  props.option.textPosition === 'inside' ? 'inside' : 'right',
)
const showRightText = computed(
  () => props.option.showPercentage && textPosition.value === 'right',
)
const showInsideText = computed(
  () => props.option.showPercentage && textPosition.value === 'inside',
)

const trackStyle = computed(() => ({
  height: String(trackHeight.value) + 'px',
  borderRadius: String(borderRadius.value) + 'px',
  backgroundColor: props.option.trackColor || '#35465A',
}))

const fillStyle = computed(() => ({
  width: String(percentage.value) + '%',
  borderRadius: String(borderRadius.value) + 'px',
  backgroundColor: props.option.fillColor || '#08B5D2',
}))

const textStyle = computed(() => ({
  color: props.option.textColor || '#D0D8E2',
  fontSize: String(textSize.value) + 'px',
}))

/**
 * 让状态规则读取当前百分比，沿用其它部件向运行时上下文发布 value 的约定；
 * 配置值变化时只更新当前实例，不创建额外计时器或监听器。
 */
watch(
  [percentage, () => props.widgetId],
  ([value, widgetId]) => {
    widgetRuntimeValueContext.setRuntimeValue(widgetId, 'value', value)
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.widget-progress {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 100%;
  user-select: none;
}
.widget-progress__track {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}
.widget-progress__fill {
  width: 0;
  height: 100%;
  transition: width 180ms ease-out;
}
.widget-progress__text {
  flex: 0 0 auto;
  line-height: 1;
  white-space: nowrap;
}
.widget-progress__text--inside {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
</style>
