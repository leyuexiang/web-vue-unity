<template>
  <div ref="containerRef" class="decorate-border-09">
    <svg :width="w" :height="h">
      <!-- 背景 -->
      <polygon :fill="option.backgroundColor" :points="` 9, 7 ${w - 9}, 7 ${w - 9}, ${h - 7} 9, ${h - 7}`"/>

      <!-- 四角圆点 -->
      <circle :fill="option.colors[1]" cx="5" cy="5" r="2"/>
      <circle :fill="option.colors[1]" :cx="w - 5" cy="5" r="2"/>
      <circle :fill="option.colors[1]" :cx="w - 5" :cy="h - 5" r="2"/>
      <circle :fill="option.colors[1]" cx="5" :cy="h - 5" r="2"/>

      <!-- 上下边线 -->
      <polyline :stroke="option.colors[0]" :points="`10, 4 ${w - 10}, 4`"/>
      <polyline :stroke="option.colors[0]" :points="`10, ${h - 4} ${w - 10}, ${h - 4}`"/>

      <!-- 左右边线 -->
      <polyline :stroke="option.colors[0]" :points="`5, 70 5, ${h - 70}`"/>
      <polyline :stroke="option.colors[0]" :points="`${w - 5}, 70 ${w - 5}, ${h - 70}`"/>

      <!-- 左侧刻度线 -->
      <polyline :stroke="option.colors[0]" :points="`3, 10, 3, 50`"/>
      <polyline :stroke="option.colors[0]" :points="`7, 30 7, 80`"/>

      <!-- 右侧刻度线 -->
      <polyline :stroke="option.colors[0]" :points="`${w - 3}, 10 ${w - 3}, 50`"/>
      <polyline :stroke="option.colors[0]" :points="`${w - 7}, 30 ${w - 7}, 80`"/>

      <!-- 左下刻度线 -->
      <polyline :stroke="option.colors[0]" :points="`3, ${h - 10} 3, ${h - 50}`"/>
      <polyline :stroke="option.colors[0]" :points="`7, ${h - 30} 7, ${h - 80}`"/>

      <!-- 右下刻度线 -->
      <polyline :stroke="option.colors[0]" :points="`${w - 3}, ${h - 10} ${w - 3}, ${h - 50}`"/>
      <polyline :stroke="option.colors[0]" :points="`${w - 7}, ${h - 30} ${w - 7}, ${h - 80}`"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder09' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-09 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
