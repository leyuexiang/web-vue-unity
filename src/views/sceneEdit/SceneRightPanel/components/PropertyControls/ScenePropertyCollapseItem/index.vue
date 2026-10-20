<template>
  <!--
    折叠项共享入口与 ScenePropertyCollapse 配套使用。
    标题、箭头和内容全部通过插槽透传，业务面板只声明分组名称与内容，避免复制折叠项样式。
  -->
  <el-collapse-item
    v-bind="controlAttrs"
    :class="['scene-edit-property-collapse-item', attrs.class]"
    :style="attrs.style"
  >
    <template #default>
      <slot />
    </template>
    <template v-if="slots.title" #title="slotProps">
      <slot name="title" v-bind="slotProps" />
    </template>
    <template v-if="slots.icon" #icon="slotProps">
      <slot name="icon" v-bind="slotProps" />
    </template>
  </el-collapse-item>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'

defineOptions({
  /** 共享折叠项自行合并 class/style，保证可变宽度布局只作用于当前折叠项。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
const slots = useSlots()

/** 移除包装节点专用属性，保留 name、title、disabled 及全部原生事件。 */
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
