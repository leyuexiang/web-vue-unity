<template>
  <div ref="containerRef" class="decorate-04">
    <svg :width="w" :height="h">
      <polyline
        :stroke="option.colors[0]"
        stroke-width="2"
        fill="transparent"
        :points="`${xPos(0)}, 0 ${xPos(30)}, ${h / 2}`"
      />
      <polyline
        :stroke="option.colors[0]"
        stroke-width="2"
        fill="transparent"
        :points="`${xPos(20)}, 0 ${xPos(50)}, ${h / 2} ${xPos(w)}, ${h / 2}`"
      />
      <polyline
        :stroke="option.colors[1]"
        fill="transparent"
        stroke-width="3"
        :points="`${xPos(0)}, ${h - 3}, ${xPos(200)}, ${h - 3}`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VDecorate04' })

const props = defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

const xPos = (pos: number) => {
  if (!props.option.reverse) return pos
  return w.value - pos
}
</script>

<style scoped>
.decorate-04 {
  position: relative;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，线条会空白。 */
  width: 100%;
  height: 100%;
}
</style>
