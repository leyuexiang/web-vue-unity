<template>
  <!--
    映射行共享结构：标签、映射控件和状态固定为三列，但每列都允许收缩。
    业务面板通过三个插槽提供字段选择器、删除动作和状态文案，避免共享组件耦合业务模型。
  -->
  <div
    class="scene-edit-property-mapping-list__row"
    :class="attrs.class"
    :style="rootStyle"
  >
    <div class="scene-edit-property-mapping-list__label">
      <slot name="label" />
    </div>
    <div class="scene-edit-property-mapping-list__control">
      <slot name="control" />
    </div>
    <div class="scene-edit-property-mapping-list__status">
      <slot name="status" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'

defineOptions({
  /** 映射行自行接管 class/style，避免属性继续继承到内部列。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
const rootStyle = computed<StyleValue | undefined>(() => attrs.style as StyleValue | undefined)
</script>
