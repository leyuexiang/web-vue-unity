<template>
  <!--
    属性抽屉共享外壳：设计尺寸通过变量控制，实际尺寸不超过当前视口。
    抽屉内容、校验和动作仍由业务组件持有，避免共享层读取场景或交互状态。
  -->
  <el-drawer
    v-bind="passthroughAttrs"
    :model-value="modelValue"
    :class="drawerClass"
    :style="drawerStyle"
    :title="title"
    :direction="direction"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
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
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots, type CSSProperties } from 'vue'

defineOptions({
  name: 'ScenePropertyDrawer',
  inheritAttrs: false,
})

type DrawerDirection = 'rtl' | 'ltr' | 'ttb' | 'btt'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    /** 设计稿期望尺寸；横向抽屉表示宽度，纵向抽屉表示高度。 */
    size?: string | number
    direction?: DrawerDirection
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    destroyOnClose?: boolean
    appendToBody?: boolean
    lockScroll?: boolean
  }>(),
  {
    title: '',
    size: 400,
    direction: 'rtl',
    closeOnClickModal: true,
    closeOnPressEscape: true,
    destroyOnClose: false,
    appendToBody: true,
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

/** 数值尺寸统一补 px，字符串原样透传给共享尺寸变量。 */
const normalizedSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
)

const passthroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const drawerClass = computed(() => ['scene-edit-drawer', 'scene-edit-property-drawer', attrs.class])

const drawerStyle = computed<CSSProperties[]>(() => [
  {
    '--scene-edit-property-drawer-size': normalizedSize.value,
  } as CSSProperties,
  (attrs.style || {}) as CSSProperties,
])
</script>
