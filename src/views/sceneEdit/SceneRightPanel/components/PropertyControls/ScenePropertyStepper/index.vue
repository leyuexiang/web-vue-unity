<template>
  <!--
    属性面板共享数值步进器：减号、数值、加号固定为三列。
    组件只处理单步增减、边界和小数精度，业务字段仍由调用方通过 v-model 与 change 事件持有。
  -->
  <div
    class="scene-edit-property-stepper"
    :class="attrs.class"
    :style="rootStyle"
  >
    <ScenePropertyButton
      class="scene-edit-property-stepper__button"
      native-type="button"
      :disabled="!canDecrease"
      :aria-label="decreaseLabel"
      @click="commitStep(-1)"
    >
      <el-icon aria-hidden="true"><Minus /></el-icon>
    </ScenePropertyButton>

    <ScenePropertyNumberInput
      v-model="model"
      v-bind="inputAttrs"
      class="scene-edit-property-stepper__input"
      :min="min"
      :max="max"
      :step="normalizedStep"
      :precision="precision"
      :controls="false"
      :disabled="disabled"
      @change="handleInputChange"
    />

    <ScenePropertyButton
      class="scene-edit-property-stepper__button"
      native-type="button"
      :disabled="!canIncrease"
      :aria-label="increaseLabel"
      @click="commitStep(1)"
    >
      <el-icon aria-hidden="true"><Plus /></el-icon>
    </ScenePropertyButton>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyNumberInput from '@/components/ScenePropertyNumberInput/index.vue'

defineOptions({
  /** 根节点接管布局属性，数字输入相关属性和监听器通过 inputAttrs 继续透传。 */
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    precision?: number
    disabled?: boolean
    width?: string | number
    decreaseLabel?: string
    increaseLabel?: string
  }>(),
  {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
    step: 1,
    precision: undefined,
    disabled: false,
    width: undefined,
    decreaseLabel: '减小数值',
    increaseLabel: '增大数值',
  },
)

const emit = defineEmits<{
  /** 键盘输入和按钮步进统一发出 change，调用方不需要区分交互来源。 */
  (event: 'change', value: number | undefined): void
}>()

const model = defineModel<number | null | undefined>()
const attrs = useAttrs()

/** 非法、零或负步长统一回退到 1，避免按钮点击后出现反向变化或 NaN。 */
const normalizedStep = computed(() => {
  const candidate = Number(props.step)
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 1
})

const readonly = computed(() => attrs.readonly === '' || attrs.readonly === true)
const interactionDisabled = computed(() => props.disabled || readonly.value)
const currentNumber = computed(() => {
  const candidate = Number(model.value)
  return Number.isFinite(candidate) ? candidate : undefined
})
const canDecrease = computed(
  () => !interactionDisabled.value && (currentNumber.value === undefined || currentNumber.value > props.min),
)
const canIncrease = computed(
  () => !interactionDisabled.value && (currentNumber.value === undefined || currentNumber.value < props.max),
)

/**
 * 根据显式 precision 或 step 推导小数位，限制到 12 位以避免超大倍数造成精度和性能问题。
 * 科学计数法也会被展开计算，保证 0.001 与 1e-3 获得相同的步进行为。
 */
const resolveDecimalPlaces = (value: number) => {
  const text = String(value).toLowerCase()
  const [coefficient, exponentText] = text.split('e')
  const exponent = Number(exponentText ?? 0)
  const fractionLength = coefficient.split('.')[1]?.length ?? 0
  return Math.min(Math.max(fractionLength - exponent, 0), 12)
}

/** 对步进结果做边界钳制和十进制定点修正，避免 0.5 连续点击累积浮点误差。 */
const normalizeValue = (value: number) => {
  const clampedValue = Math.min(Math.max(value, props.min), props.max)
  const decimalPlaces =
    props.precision === undefined
      ? resolveDecimalPlaces(normalizedStep.value)
      : Math.min(Math.max(Math.trunc(props.precision), 0), 12)
  const factor = 10 ** decimalPlaces
  return Math.round((clampedValue + Number.EPSILON) * factor) / factor
}

const commitStep = (direction: -1 | 1) => {
  if (interactionDisabled.value) return

  /** 空值从合法最小值或 0 起步，避免 Number(null) 被误当成用户输入的 0。 */
  const baseValue =
    currentNumber.value ?? (Number.isFinite(props.min) ? Math.max(props.min, 0) : 0)
  const nextValue = normalizeValue(baseValue + normalizedStep.value * direction)
  model.value = nextValue
  emit('change', nextValue)
}

const handleInputChange = (value: number | undefined) => {
  emit('change', value)
}

/** 与其它共享属性控件一致，width 只约束外壳，不给内部三列写死像素总宽。 */
const rootStyle = computed<StyleValue | undefined>(() => {
  const width = props.width
  const widthStyle =
    width === undefined || width === null || width === ''
      ? undefined
      : { width: typeof width === 'number' ? `${width}px` : width }

  if (!widthStyle && !attrs.style) return undefined
  return [widthStyle, attrs.style as StyleValue]
})

/** class/style/readonly 已由外壳消费，其余数字输入属性与事件继续交给共享数字输入。 */
const inputAttrs = computed(() => {
  const { class: _class, style: _style, readonly: _readonly, ...rest } = attrs
  return rest
})
</script>
