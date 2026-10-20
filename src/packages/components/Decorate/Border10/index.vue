<template>
  <div ref="containerRef" class="decorate-border-10">
    <svg :width="w" :height="h">
      <!-- 背景 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`
        ${w - 15}, 22 170, 22 150, 7 40, 7 28, 21 32, 24
        16, 42 16, ${h - 32} 41, ${h - 7} ${w - 15}, ${h - 7}
      `"
      />

      <!-- 主边框线 -->
      <polyline
        class="border-line-1"
        :stroke="option.colors[0]"
        :points="`145, ${h - 5} 40, ${h - 5} 10, ${h - 35}
          10, 40 40, 5 150, 5 170, 20 ${w - 15}, 20`"
      />
      <polyline
        :stroke="option.colors[1]"
        class="border-line-2"
        :points="`245, ${h - 1} 36, ${h - 1} 14, ${h - 23}
          14, ${h - 100}`"
      />

      <!-- 装饰线 -->
      <polyline
        class="border-line-3"
        :stroke="option.colors[0]"
        :points="`7, ${h - 40} 7, ${h - 75}`"
      />
      <polyline
        class="border-line-4"
        :stroke="option.colors[0]"
        :points="`28, 24 13, 41 13, 64`"
      />
      <polyline
        class="border-line-5"
        :stroke="option.colors[0]"
        :points="`5, 45 5, 140`"
      />
      <polyline
        class="border-line-6"
        :stroke="option.colors[1]"
        :points="`14, 75 14, 180`"
      />
      <polyline
        class="border-line-7"
        :stroke="option.colors[1]"
        :points="`55, 11 147, 11 167, 26 250, 26`"
      />
      <polyline
        class="border-line-8"
        :stroke="option.colors[1]"
        :points="`158, 5 173, 16`"
      />
      <polyline
        class="border-line-9"
        :stroke="option.colors[0]"
        :points="`200, 17 ${w - 10}, 17`"
      />
      <polyline
        class="border-line-10"
        :stroke="option.colors[1]"
        :points="`385, 17 ${w - 10}, 17`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder10' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-10 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-10 polyline {
  fill: none;
}
.decorate-border-10 .border-line-1,
.decorate-border-10 .border-line-2,
.decorate-border-10 .border-line-3,
.decorate-border-10 .border-line-6,
.decorate-border-10 .border-line-7,
.decorate-border-10 .border-line-10 {
  stroke-width: 1;
}
.decorate-border-10 .border-line-3,
.decorate-border-10 .border-line-4,
.decorate-border-10 .border-line-8,
.decorate-border-10 .border-line-9 {
  stroke-width: 3px;
  stroke-linecap: round;
}
.decorate-border-10 .border-line-9 {
  stroke-dasharray: 100 250;
}
.decorate-border-10 .border-line-10 {
  stroke-dasharray: 80 270;
}
</style>
