<template>
  <!-- 单选组共享入口：只透传模型、事件和子项插槽，不持有业务枚举。 -->
  <el-radio-group
    v-bind="controlAttrs"
    v-model="model"
    :class="['scene-edit-property-radio-group', attrs.class]"
  >
    <slot />
  </el-radio-group>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  /** 共享组件自行合并 class，避免调用方布局类被重复继承。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
/** 单选值可能是字符串、数字或布尔值，未初始化状态由可选模型自动处理。 */
const model = defineModel<string | number | boolean>()

/** 仅移除 class，其余尺寸、禁用态和 change 事件交给原生单选组。 */
const controlAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
