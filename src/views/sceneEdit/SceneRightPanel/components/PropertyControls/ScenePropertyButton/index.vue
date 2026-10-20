<template>
  <!--
    右侧属性面板按钮共享入口。
    组件不封装业务点击逻辑，只将 Element Plus 按钮的属性、事件和默认插槽原样透传，
    这样配置面板可以统一视觉基线，同时不改变原有按钮的交互契约。
  -->
  <el-button
    v-bind="controlAttrs"
    :class="['scene-edit-property-button', attrs.class]"
    :style="buttonStyle"
  >
    <template #default>
      <slot />
    </template>
    <template v-if="slots.icon" #icon>
      <slot name="icon" />
    </template>
    <template v-if="slots.loading" #loading>
      <slot name="loading" />
    </template>
  </el-button>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots, type StyleValue } from 'vue'

defineOptions({
  /** 由共享入口接管 class/style，避免属性同时落到错误的包装节点。 */
  inheritAttrs: false,
})

const props = defineProps<{
  /** 可选语义宽度；未传值时保留 Element Plus 的内容自适应行为。 */
  width?: string | number
}>()

const attrs = useAttrs()
const slots = useSlots()

/** 将 width 属性与调用方 style 合并，支持右侧面板宽度拖动后的剩余空间布局。 */
const buttonStyle = computed<StyleValue | undefined>(() => {
  const width = props.width
  const widthStyle =
    width === undefined || width === null || width === ''
      ? undefined
      : { width: typeof width === 'number' ? `${width}px` : width }

  if (!widthStyle && !attrs.style) {
    return undefined
  }

  return [widthStyle, attrs.style as StyleValue]
})

/** class/style 已由共享组件接管，其余属性和事件继续交给 Element Plus。 */
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
