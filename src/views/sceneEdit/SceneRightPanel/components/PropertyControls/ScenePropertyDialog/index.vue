<template>
  <!--
    属性弹窗共享外壳：宽度只作为设计宽度变量传入，最终尺寸始终受视口安全边距约束。
    业务弹窗继续持有表单、校验和保存逻辑，共享层仅负责容器、插槽和生命周期事件透传。
  -->
  <el-dialog
    v-bind="passthroughAttrs"
    :model-value="modelValue"
    :class="dialogClass"
    :style="dialogStyle"
    :title="title"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
    :align-center="alignCenter"
    :lock-scroll="lockScroll"
    @update:model-value="emit('update:modelValue', $event)"
    @open="emit('open')"
    @opened="emit('opened')"
    @close="emit('close')"
    @closed="emit('closed')"
  >
    <slot />

    <template v-if="slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots, type CSSProperties } from 'vue'

defineOptions({
  name: 'ScenePropertyDialog',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    /** 设计稿期望宽度；共享样式会继续用视口安全边距限制最终宽度。 */
    width?: string | number
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    destroyOnClose?: boolean
    appendToBody?: boolean
    alignCenter?: boolean
    lockScroll?: boolean
  }>(),
  {
    title: '',
    width: 720,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    destroyOnClose: false,
    appendToBody: true,
    alignCenter: false,
    lockScroll: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  opened: []
  close: []
  closed: []
}>()

const attrs = useAttrs()
const slots = useSlots()

/** 数值宽度统一补 px，字符串原样保留，支持后续设计需要的 rem 或百分比语义。 */
const normalizedWidth = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width,
)

/** class 与 style 留在共享根节点，其他属性继续传给 Element Plus 弹窗。 */
const passthroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const dialogClass = computed(() => ['scene-edit-dialog', 'scene-edit-property-dialog', attrs.class])

const dialogStyle = computed<CSSProperties[]>(() => [
  {
    '--scene-edit-property-dialog-width': normalizedWidth.value,
  } as CSSProperties,
  (attrs.style || {}) as CSSProperties,
])
</script>
