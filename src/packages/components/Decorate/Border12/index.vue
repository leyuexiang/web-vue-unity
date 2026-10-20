<template>
  <div ref="containerRef" class="decorate-border-12">
    <svg :width="w" :height="h">
      <!-- 缺角背景 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`
        10, 22 ${w - 22}, 22 ${w - 22}, ${h - 86} ${w - 84}, ${h - 24} 10, ${h - 24}
      `"
      />

      <!-- 外层边框线 -->
      <polyline
        class="border-line-1"
        :stroke="option.colors[0]"
        :points="`8, 5 ${w - 5}, 5 ${w - 5}, ${h - 100}
          ${w - 100}, ${h - 5} 8, ${h - 5} 8, 5`"
      />
      <!-- 内层边框线 -->
      <polyline
        class="border-line-2"
        :stroke="option.colors[1]"
        :points="`3, 5 ${w - 20}, 5 ${w - 20}, ${h - 60}
          ${w - 74}, ${h - 5} 3, ${h - 5} 3, 5`"
      />
      <!-- 上边装饰线1 -->
      <polyline
        class="border-line-3"
        :stroke="option.colors[1]"
        :points="`50, 13 ${w - 35}, 13`"
      />
      <!-- 上边装饰线2 -->
      <polyline
        class="border-line-4"
        :stroke="option.colors[1]"
        :points="`15, 20 ${w - 35}, 20`"
      />
      <!-- 下边装饰线1 -->
      <polyline
        class="border-line-5"
        :stroke="option.colors[1]"
        :points="`15, ${h - 20} ${w - 110}, ${h - 20}`"
      />
      <!-- 下边装饰线2 -->
      <polyline
        class="border-line-6"
        :stroke="option.colors[1]"
        :points="`15, ${h - 13} ${w - 110}, ${h - 13}`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder12' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-12 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-12 polyline {
  fill: none;
}
</style>
