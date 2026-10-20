<template>
  <!-- 保留原图圆头交叉线及留白，宽高随容器拉伸；不绑定未经配置的关闭行为。 -->
  <svg
    class="close-icon"
    viewBox="0 0 24 24"
    preserveAspectRatio="none"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :stroke="option.color ?? '#4AC36A'"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M7 7L17 17" />
    <path d="M7 17L17 7" />
  </svg>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VCloseIcon' })
defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
/* 静态矢量图直接适配容器，不增加尺寸监听和事件监听。 */
.close-icon {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
