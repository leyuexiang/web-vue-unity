<template>
  <div class="widget-number">
    <span class="widget-number__prefix" :style="prefixStyle">{{ option.prefixText }}</span>
    <span class="widget-number__value" :style="valueStyle">{{ displayText }}</span>
    <span class="widget-number__suffix" :style="suffixStyle">{{ option.suffixText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'
import { createNumberAnimationController } from './numberAnimation'

defineOptions({ name: 'VNumber' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const toNumber = (value: unknown) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

/**
 * 数据面板保存后画布可能按渲染版本局部重挂载组件。
 * 此时优先恢复同一部件刚刚上报的显示值，保证新动画从用户看到的数字继续；
 * 首次创建没有运行值时仍从 0 开始，保留数字计数器首次入场的增长效果。
 */
const runtimeValue = widgetRuntimeValueContext.getRuntimeValue(props.widgetId, 'value')
const displayValue = ref(runtimeValue === undefined ? 0 : toNumber(runtimeValue))

const formatNumber = (value: number) => {
  const precision = Math.max(0, Number(props.option.precision) || 0)
  const safeValue = Number.isFinite(value) ? value : 0
  const fixedValue = safeValue.toFixed(precision)
  if (!props.option.showSeparator) return fixedValue

  const [integerPart, decimalPart] = fixedValue.split('.')
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
}

/**
 * 动画控制器始终读取当前已经渲染的 displayValue。
 * 新终点在动画途中到达时，会取消旧帧并从当前显示值继续，不再回到 0 或历史终点。
 */
const numberAnimation = createNumberAnimationController({
  getCurrentValue: () => displayValue.value,
  setCurrentValue: (value) => {
    displayValue.value = value
  },
  getDuration: () => Math.max(0.5, Number(props.option.dur) || 0.5) * 1000,
})

const displayText = computed(() => formatNumber(displayValue.value))
const prefixStyle = computed(() => ({
  color: props.option.prefixColor,
  fontSize: `${props.option.numberSize}px`,
}))
const valueStyle = computed(() => ({
  color: props.option.numberColor,
  fontSize: `${props.option.numberSize}px`,
}))
const suffixStyle = computed(() => ({
  color: props.option.suffixColor,
  fontSize: `${props.option.numberSize}px`,
}))

/**
 * 首次创建从 0 播放；渲染版本刷新造成重挂载时，从上一次运行值继续播放。
 */
onMounted(() => {
  numberAnimation.animateTo(props.option.dataset)
})

watch(
  () => props.option.dataset,
  (nextDataset, previousDataset) => {
    /**
     * 这里只监听终点值本身，避免切换选中对象、修改基础属性时因为 option 对象引用变化而误重播。
     * 当数据映射真正把终点值改掉时，再从当前显示值滚动到新的目标值。
     */
    if (nextDataset === previousDataset) return
    numberAnimation.animateTo(nextDataset)
  },
)

onBeforeUnmount(() => {
  numberAnimation.stop()
})

watch(
  displayValue,
  (newValue) => {
    /**
     * 数字计数器需要把“当前动画显示值”上报出去，而不是只上报最终目标值。
     * 这样规则判断才能真正感知到计数动画过程中的实时数值。
     * 写入入口通过上下文注入，避免组件包直接依赖编辑器仓库。
     */
    const precision = Math.max(0, Number(props.option.precision) || 0)
    widgetRuntimeValueContext.setRuntimeValue(
      props.widgetId,
      'value',
      Number(Number.isFinite(newValue) ? newValue.toFixed(precision) : 0),
    )
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
.widget-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  white-space: nowrap;
  user-select: none;
}
.widget-number__prefix,
.widget-number__value,
.widget-number__suffix {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-suffix-font-family: v-bind("props.option.suffixFontFamily || 'initial'");

  font-family: var(--widget-suffix-font-family, inherit);
  line-height: 1;
  text-shadow: 0 0 8px rgb(74 158 248 / 20%);
}
.widget-number__prefix + .widget-number__value,
.widget-number__value + .widget-number__suffix {
  margin-left: 4px;
}

/* 字体只影响对应文字区域；缺省时继承旧样式，不参与计时或数据刷新。 */
.widget-number__prefix {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-prefix-font-family: v-bind("props.option.prefixFontFamily || 'initial'");

  font-family: var(--widget-prefix-font-family, inherit);
}
.widget-number__value {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-number-font-family: v-bind("props.option.numberFontFamily || 'initial'");

  font-family: var(--widget-number-font-family, inherit);
}
</style>
