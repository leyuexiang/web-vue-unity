<template>
  <div class="widget-flipper-number" :style="rootStyle">
    <Flipper
      v-for="(item, index) in flipperData"
      :key="index"
      class="widget-flipper-number__digit"
      :count="item"
      :width="option.flipperWidth"
      :height="option.flipperHeight"
      :front-color="option.flipperTextColor"
      :back-color="option.flipperBgColor"
      :radius="option.flipperRadius"
      :flip-type="option.flipperType"
      :duration="option.flipperSpeed"
      :border-width="option.flipperBorderWidth"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Flipper } from '@/components/Pages/Flipper'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'

defineOptions({ name: 'VFlipperNumber' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const flipperData = ref<string[]>([])

const toNumberText = (value: unknown) => {
  const safeValue = Number(value)
  return Number.isFinite(safeValue) ? safeValue.toString() : '0'
}

const getFlipperData = (value: string | number) => {
  return toNumberText(value)
    .padStart(Math.max(Number(props.option.flipperLength) || 1, 1), '0')
    .split('')
    .slice((Number(props.option.flipperLength) || 1) * -1)
}

const updateDigits = (value: string | number) => {
  flipperData.value = getFlipperData(value)
  // 翻牌数字只上报当前展示数值，具体写入由画布上下文适配到当前项目二维仓库。
  widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', Number(toNumberText(value)))
}

const rootStyle = computed(() => ({
  gap: `${props.option.flipperGap}px`,
}))

watch(
  [() => props.option.dataset, () => props.option.flipperLength],
  () => {
    updateDigits(props.option.dataset)
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.widget-flipper-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
}
.widget-flipper-number__digit {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  flex: 0 0 auto;
  font-family: var(--widget-font-family, inherit);
}
</style>
