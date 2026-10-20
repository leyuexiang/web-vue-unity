<template>
  <!-- 渐变直接铺满容器，两端颜色自带透明度，不再额外叠加整体透明度。 -->
  <div class="resource-background" :style="{ backgroundImage: gradientBackground }" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type Config from './config'

defineOptions({ name: 'VBorderGradient' })

const props = defineProps<{ option: Config['option'] }>()

// 旧场景的空配置回退到原图色值；仅颜色变化时重新计算，不依赖尺寸或逐帧监听。
const gradientBackground = computed(() => {
  const topColor = props.option.topColor ?? 'rgba(30, 30, 30, 0.117647)'
  const bottomColor = props.option.bottomColor ?? 'rgba(30, 30, 30, 0.6)'
  return `linear-gradient(to bottom, ${topColor}, ${bottomColor})`
})
</script>

<style scoped>
/* 原生背景渐变随容器宽高铺满，不受原图宽高比影响。 */
.resource-background {
  display: block;
  width: 100%;
  height: 100%;

  /* 保持原图的 3px 宿主背景模糊，颜色透明度不会重复乘入滤镜。 */
  backdrop-filter: blur(3px);
}
</style>
