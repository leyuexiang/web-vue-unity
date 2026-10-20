<template>
  <!-- 纯色矩形直接填充容器，避免外链矢量图保持原始宽高比而在横向留白。 -->
  <div class="resource-color-block" :style="{ backgroundColor: option.color ?? '#4AC36A' }" />
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VDecorateGreenBar' })

// 复用编辑器的响应式配置；旧场景尚未包含颜色字段时，模板回退到原始绿色。
defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
/* 填满公共布局容器，缩放无需尺寸监听器或逐帧计算。 */
.resource-color-block {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
