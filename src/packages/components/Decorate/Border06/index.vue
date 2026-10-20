<template>
  <div
    ref="containerRef"
    class="decorate-border-06"
    :style="`
      box-shadow: inset 0 0 40px ${option.colors[0]};
      border: 1px solid ${option.colors[1]};
      background-color: ${option.backgroundColor};
    `"
  >
    <svg :width="w" :height="h">
      <!-- 外层边角线（4条） -->
      <polyline
        class="border-line-w-2"
        :stroke="option.colors[0]"
        :points="`0, 25 0, 0 25, 0`"
      />
      <polyline
        class="border-line-w-2"
        :stroke="option.colors[0]"
        :points="`${w - 25}, 0 ${w}, 0 ${w}, 25`"
      />
      <polyline
        class="border-line-w-2"
        :stroke="option.colors[0]"
        :points="`${w - 25}, ${h} ${w}, ${h} ${w}, ${h - 25}`"
      />
      <polyline
        class="border-line-w-2"
        :stroke="option.colors[0]"
        :points="`0, ${h - 25} 0, ${h} 25, ${h}`"
      />

      <!-- 内层边角线（4条） -->
      <polyline
        class="border-line-w-5"
        :stroke="option.colors[1]"
        :points="`0, 10 0, 0 10, 0`"
      />
      <polyline
        class="border-line-w-5"
        :stroke="option.colors[1]"
        :points="`${w - 10}, 0 ${w}, 0 ${w}, 10`"
      />
      <polyline
        class="border-line-w-5"
        :stroke="option.colors[1]"
        :points="`${w - 10}, ${h} ${w}, ${h} ${w}, ${h - 10}`"
      />
      <polyline
        class="border-line-w-5"
        :stroke="option.colors[1]"
        :points="`0, ${h - 10} 0, ${h} 10, ${h}`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder06' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-06 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-06 polyline {
  fill: none;
  stroke-linecap: round;
}
.decorate-border-06 .border-line-w-2 {
  stroke-width: 2;
}
.decorate-border-06 .border-line-w-5 {
  stroke-width: 5;
}
</style>
