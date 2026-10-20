<template>
  <div ref="containerRef" class="decorate-border-13">
    <svg :width="w" :height="h">
      <!-- 背景 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`
        7, 7 ${w - 7}, 7 ${w - 7}, ${h - 7} 7, ${h - 7}
      `"
      />

      <!-- 外层矩形边框 -->
      <polyline
        :stroke="option.colors[0]"
        :points="`2, 2 ${w - 2} ,2 ${w - 2}, ${h - 2} 2, ${h - 2} 2, 2`"
      />
      <!-- 内层矩形边框 -->
      <polyline
        :stroke="option.colors[1]"
        :points="`6, 6 ${w - 6}, 6 ${w - 6}, ${h - 6} 6, ${h - 6} 6, 6`"
      />

      <!-- 四角圆点 -->
      <circle :fill="option.colors[0]" cx="11" cy="11" r="1" />
      <circle :fill="option.colors[0]" :cx="w - 11" cy="11" r="1" />
      <circle :fill="option.colors[0]" :cx="w - 11" :cy="h - 11" r="1" />
      <circle :fill="option.colors[0]" cx="11" :cy="h - 11" r="1" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder13' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-13 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-13 polyline {
  fill: none;
}
</style>
