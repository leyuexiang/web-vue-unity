<template>
  <div class="widget-countdown" :style="rootStyle">
    <template v-if="option.showDay">
      <Flipper
        v-for="(item, index) in daysFlipperData"
        :key="`day-${index}`"
        class="widget-countdown__digit"
        :count="item"
        :width="option.flipperWidth"
        :height="option.flipperHeight"
        :front-color="option.flipperTextColor"
        :back-color="option.flipperBgColor"
        :radius="option.flipperRadius"
        :flip-type="option.flipperType"
        :duration="option.flipperSpeed"
      />
      <span class="widget-countdown__unit" :style="unitStyle">{{
        option.style === '时分秒' ? '天' : ':'
      }}</span>
    </template>

    <Flipper
      v-for="(item, index) in hoursFlipperData"
      :key="`hour-${index}`"
      class="widget-countdown__digit"
      :count="item"
      :width="option.flipperWidth"
      :height="option.flipperHeight"
      :front-color="option.flipperTextColor"
      :back-color="option.flipperBgColor"
      :radius="option.flipperRadius"
      :flip-type="option.flipperType"
      :duration="option.flipperSpeed"
    />
    <span class="widget-countdown__unit" :style="unitStyle">{{
      option.style === '时分秒' ? '时' : ':'
    }}</span>

    <Flipper
      v-for="(item, index) in minutesFlipperData"
      :key="`minute-${index}`"
      class="widget-countdown__digit"
      :count="item"
      :width="option.flipperWidth"
      :height="option.flipperHeight"
      :front-color="option.flipperTextColor"
      :back-color="option.flipperBgColor"
      :radius="option.flipperRadius"
      :flip-type="option.flipperType"
      :duration="option.flipperSpeed"
    />
    <span class="widget-countdown__unit" :style="unitStyle">{{
      option.style === '时分秒' ? '分' : ':'
    }}</span>

    <Flipper
      v-for="(item, index) in secondsFlipperData"
      :key="`second-${index}`"
      class="widget-countdown__digit"
      :count="item"
      :width="option.flipperWidth"
      :height="option.flipperHeight"
      :front-color="option.flipperTextColor"
      :back-color="option.flipperBgColor"
      :radius="option.flipperRadius"
      :flip-type="option.flipperType"
      :duration="option.flipperSpeed"
    />
    <span v-if="option.style === '时分秒'" class="widget-countdown__unit" :style="unitStyle"
      >秒</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Flipper } from '@/components/Pages/Flipper'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'

defineOptions({ name: 'VCountDown' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const daysFlipperData = ref<string[]>([])
const hoursFlipperData = ref<string[]>([])
const minutesFlipperData = ref<string[]>([])
const secondsFlipperData = ref<string[]>([])
const countdownDeadline = ref(0)

let timer: ReturnType<typeof setInterval> | null = null

const rootStyle = computed(() => ({
  gap: `${props.option.flipperGap}px`,
}))
const unitStyle = computed(() => ({
  color: props.option.flipperTextColor,
  fontSize: `${props.option.flipperWidth}px`,
  lineHeight: `${props.option.flipperHeight}px`,
}))

const padDigits = (value: number) => {
  const normalizedValue = Math.max(0, Math.floor(value))
  const length = Math.max(String(normalizedValue).length, 2)
  return String(normalizedValue).padStart(length, '0').split('')
}

const updateDigits = () => {
  const duration = Math.max(countdownDeadline.value - Date.now(), 0)

  const totalSeconds = Math.floor(duration / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  daysFlipperData.value = padDigits(days)
  hoursFlipperData.value = padDigits(props.option.showDay ? hours % 24 : hours)
  minutesFlipperData.value = padDigits(minutes)
  secondsFlipperData.value = padDigits(seconds)
  /**
   * 倒计时对规则系统暴露“当前剩余秒数”。
   * 数值语义最稳定，既能做大小比较，也不受展示样式（时分秒 / 冒号分隔）影响。
   * 写入入口通过上下文注入，避免组件包直接依赖当前编辑器仓库。
   */
  widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', totalSeconds)
}

/**
 * 这里把“倒计时起点”固化成一个截止时间戳：
 * - 固定秒数模式：组件初始化时用“当前时间 + dataset 秒”计算截止时间；
 * - 固定结束日期模式：直接使用 endDate。
 *
 * 之前每次轮询都直接读取固定的 dataset 秒数，结果会一直算出同一个剩余值，
 * 视觉上就像倒计时完全静止。改成截止时间后，轮询时只需要和当前时间做差即可持续递减。
 */
const resetCountdownDeadline = () => {
  countdownDeadline.value = props.option.useEndDate
    ? Number(props.option.endDate) || 0
    : Date.now() + Math.max(Number(props.option.dataset) || 0, 0) * 1000
}

const startTimer = () => {
  if (timer) clearInterval(timer)
  resetCountdownDeadline()
  updateDigits()
  timer = setInterval(updateDigits, 500)
}

watch([() => props.option.dataset, () => props.option.endDate, () => props.option.useEndDate], () =>
  startTimer(),
)

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.widget-countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
}
.widget-countdown__digit {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-number-font-family: v-bind("props.option.numberFontFamily || 'initial'");

  flex: 0 0 auto;
  font-family: var(--widget-number-font-family, inherit);
}
.widget-countdown__unit {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-unit-font-family: v-bind("props.option.unitFontFamily || 'initial'");

  flex: 0 0 auto;
  font-family: var(--widget-unit-font-family, inherit);
}
</style>
