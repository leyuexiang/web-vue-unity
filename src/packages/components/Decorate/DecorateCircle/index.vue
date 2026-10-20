<template>
  <!-- 圆形轮廓填满容器；宽高不等时自然拉伸为椭圆，与其他色块的缩放行为一致。 -->
  <div class="circle-block" :style="{ backgroundColor: option.color ?? 'rgba(255, 255, 255, 0.8)' }" />
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VDecorateCircle' })
defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
/* 单个元素实现原图实心圆，无图片请求、尺寸监听或逐帧计算。 */
.circle-block {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
</style>

