<template>
  <div ref="containerRef" class="decorate-border-11">
    <svg :width="w" :height="h">
      <!-- 背景 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`
        23, 23 ${w - 24}, 23 ${w - 24}, ${h - 24} 23, ${h - 24}
      `"
      />

      <!-- 外层边框线 -->
      <polyline
        class="border-line-1"
        :stroke="option.colors[0]"
        :points="`4, 4 ${w - 22} ,4 ${w - 22}, ${h - 22} 4, ${h - 22} 4, 4`"
      />
      <!-- 内层边框线1 -->
      <polyline
        class="border-line-3"
        :stroke="option.colors[1]"
        :points="`10, 10 ${w - 16}, 10 ${w - 16}, ${h - 16} 10, ${h - 16} 10, 10`"
      />
      <!-- 内层边框线2 -->
      <polyline
        class="border-line-3"
        :stroke="option.colors[1]"
        :points="`16, 16 ${w - 10}, 16 ${w - 10}, ${h - 10} 16, ${h - 10} 16, 16`"
      />
      <!-- 内层边框线3 -->
      <polyline
        class="border-line-3"
        :stroke="option.colors[1]"
        :points="`22, 22 ${w - 4}, 22 ${w - 4}, ${h - 4} 22, ${h - 4} 22, 22`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder11' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-11 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-11 polyline {
  fill: none;
}
.decorate-border-11 .border-line-1 {
  stroke-width: 1;
}
.decorate-border-11 .border-line-3 {
  stroke-width: 3;
}
</style>
