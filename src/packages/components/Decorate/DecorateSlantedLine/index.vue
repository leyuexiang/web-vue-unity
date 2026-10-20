<template>
  <!-- 取消等比约束，使线条和斜角整体随容器宽高拉伸。颜色透明度与原图局部透明度叠加。 -->
  <svg
    class="slanted-gradient-line"
    viewBox="0 0 289 10"
    preserveAspectRatio="none"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :style="{ color: option.color ?? '#4AC36A' }"
  >
    <line opacity="0.4" y1="9.5" x2="205" y2="9.5" stroke="currentColor" />
    <path d="M208.933 0H216.667L210.733 10H203L208.933 0Z" fill="currentColor" />
    <path
      opacity="0.6"
      d="M220.6 0L288.334 0L282.4 10H214.667L220.6 0Z"
      :fill="'url(#' + gradientId + ')'"
    />
    <defs>
      <linearGradient :id="gradientId" x1="296" y1="5" x2="214.667" y2="5" gradientUnits="userSpaceOnUse">
        <!-- 全透明端保留原图色值，着色端随配置更新，并保留原图的渐隐强度。 -->
        <stop stop-color="#235D33" stop-opacity="0" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0.8" />
      </linearGradient>
    </defs>
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import type Config from './config'

defineOptions({ name: 'VDecorateSlantedLine' })
defineProps<{ option: Config['option'] }>()

// 每个实例使用独立编号，复制多个装饰并分别改色时不会引用其他实例的渐变。
const gradientId = 'slanted-line-' + useId()
</script>

<style scoped>
/* 直接由容器驱动尺寸，无需尺寸监听、逐帧计算或额外图片请求。 */
.slanted-gradient-line {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
