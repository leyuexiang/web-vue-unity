<template>
  <!--
    右侧属性面板的颜色控件存在两种 Figma 变体：
    field 为“文字 + 色块 + 下拉提示”，swatch 为带外置字段标签的独立色块。
    两种变体共用同一取色器和事件透传，避免图片、标注、场景和天气出现不同的交互结果。
  -->
  <div
    class="scene-edit-property-color-picker"
    :class="`scene-edit-property-color-picker--${variant}`"
  >
    <span v-if="variant === 'field'" class="scene-edit-property-color-picker__label">
      {{ label }}
    </span>
    <el-color-picker
      :model-value="modelValue"
      :predefine="predefine"
      :popper-class="resolvedPopperClass"
      :teleported="teleported"
      :append-to="appendTo"
      :show-alpha="showAlpha"
      :color-format="colorFormat"
      :aria-label="label"
      v-bind="$attrs"
      @update:model-value="updateModelValue"
      @change="handleChange"
      @active-change="handleActiveChange"
      @click="prepareEyeDropperPanel"
    />
    <Teleport v-if="isEyeDropperPanelMounted" :to="eyeDropperPanelTarget">
      <button
        v-if="!isColorPickerDisabled"
        type="button"
        class="scene-edit-property-color-picker__panel-button"
        :class="{ 'is-picking': isPicking }"
        :disabled="!isEyeDropperSupported || isPicking"
        :aria-label="eyeDropperButtonLabel"
        :title="eyeDropperButtonLabel"
        @click.stop="pickColor"
      >
        <Aim aria-hidden="true" />
        <span>吸色</span>
      </button>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useEyeDropper } from '@vueuse/core'
import { Aim } from '@element-plus/icons-vue'
import { computed, nextTick, ref, toRefs, useAttrs, useId } from 'vue'
import type { ColorPickerProps } from 'element-plus'
import { formatEyeDropperColor } from './colorUtils'

defineOptions({
  name: 'ScenePropertyColorPicker',
  inheritAttrs: false,
})

type ColorValue = string | null
type InputColorValue = ColorValue | undefined

const props = withDefaults(
  defineProps<{
    /** field 使用的可见文字；swatch 也把它作为取色器无障碍名称，未传时使用通用名称。 */
    label?: string
    modelValue: InputColorValue
    /** 严格区分设计稿的组合颜色框与独立色块，不能用一个尺寸强行覆盖两者。 */
    variant?: 'field' | 'swatch'
    predefine?: string[]
    popperClass?: string
    teleported?: boolean
    appendTo?: string
    showAlpha?: ColorPickerProps['showAlpha']
    colorFormat?: ColorPickerProps['colorFormat']
  }>(),
  {
    /** 外层属性行已展示字段名时，保留通用无障碍名称，避免每个 swatch 重复传入标签。 */
    label: '颜色',
    variant: 'field',
    predefine: () => [],
    /**
     * 颜色弹层传送到 body 后不再继承右栏主题类，默认挂载场景编辑器弹层类，
     * 由 theme.scss 在弹层自身重新声明正式设计令牌并统一底部输入、按钮状态。
     */
    popperClass: 'scene-edit-popper scene-edit-property-color-popper',
    /**
     * 颜色面板必须传送到页面根层：右侧属性栏及滚动容器都使用 overflow: hidden，
     * 若沿用可选布尔属性的缺省 false，弹层会被限制在 300–400px 侧栏内并裁掉确认按钮。
     */
    teleported: true,
    /** 显式挂载到 body，避免调用环境中的局部传送目标再次把色板放回可裁切容器。 */
    appendTo: 'body',
  },
)
const {
  label,
  modelValue,
  variant,
  predefine,
  popperClass,
  teleported,
  appendTo,
  showAlpha,
  colorFormat,
} = toRefs(props)
const eyeDropperTargetClass = `scene-edit-property-color-popper-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const resolvedPopperClass = computed(() =>
  [popperClass.value, eyeDropperTargetClass].filter(Boolean).join(' '),
)
const eyeDropperPanelTarget = `.${eyeDropperTargetClass} .el-color-picker-panel__footer`

const emit = defineEmits<{
  /** 保留原生 v-model 写入时机，父级业务状态仍是唯一色值来源。 */
  (event: 'update:modelValue', value: ColorValue): void
  /** 保留图片、标注和天气原有的提交回调。 */
  (event: 'change', value: ColorValue): void
  /** 场景背景色在拖动色板时也需实时更新，因此继续透传活动色事件。 */
  (event: 'active-change', value: ColorValue): void
}>()

const attrs = useAttrs()
const { isSupported: isEyeDropperSupported, open: openEyeDropper } = useEyeDropper()
const isPicking = ref(false)
const isEyeDropperPanelMounted = ref(false)
const isColorPickerDisabled = computed(() => {
  const disabled = attrs.disabled
  return disabled === true || disabled === '' || disabled === 'true'
})
const eyeDropperButtonLabel = computed(() => {
  if (!isEyeDropperSupported.value) return '当前浏览器不支持屏幕吸色'
  if (isPicking.value) return '正在吸取颜色'
  return '吸取屏幕颜色'
})

/** Element Plus 可在清空或拖动过程中传出 undefined；组件向父层统一归一化为 null。 */
const normalizeColorValue = (value: string | null | undefined): ColorValue => value ?? null
const updateModelValue = (value: string | null | undefined) =>
  emit('update:modelValue', normalizeColorValue(value))
const handleChange = (value: string | null | undefined) =>
  emit('change', normalizeColorValue(value))
const handleActiveChange = (value: ColorPickerProps['modelValue']) =>
  emit('active-change', normalizeColorValue(value))

const prepareEyeDropperPanel = () => {
  if (isColorPickerDisabled.value || typeof document === 'undefined') return

  const mountButton = () => {
    if (document.querySelector(eyeDropperPanelTarget)) isEyeDropperPanelMounted.value = true
  }

  void nextTick(() => {
    mountButton()
    if (!isEyeDropperPanelMounted.value) window.setTimeout(mountButton, 50)
  })
}

const isEyeDropperAbortError = (error: unknown) =>
  (typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError') ||
  (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')

const pickColor = async () => {
  if (isColorPickerDisabled.value || !isEyeDropperSupported.value || isPicking.value) return

  isPicking.value = true
  try {
    const result = await openEyeDropper()
    if (!result?.sRGBHex) return

    const color = formatEyeDropperColor({
      sRGBHex: result.sRGBHex,
      currentValue: modelValue.value,
      colorFormat: colorFormat.value,
      showAlpha: showAlpha.value,
    })
    emit('update:modelValue', color)
    emit('change', color)
  } catch (error) {
    // 用户按 Esc 取消吸色是正常流程，其它错误仅记录，不打断当前属性面板。
    if (!isEyeDropperAbortError(error))
      console.warn('[ScenePropertyColorPicker] 屏幕吸色失败', error)
  } finally {
    isPicking.value = false
  }
}
</script>
