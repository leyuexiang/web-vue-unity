<template>
  <div ref="containerRef" class="decorate-02">
    <svg :width="w" :height="option.lineHeight">
      <polyline :stroke="option.colors[0]" :points="`0, 2.5 ${w}, 2.5`" />
      <polyline
        :stroke="option.colors[1]"
        stroke-width="3"
        stroke-dasharray="20, 80"
        stroke-dashoffset="-30"
        :points="`0, 2.5 ${w}, 2.5`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VDecorate02' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-02 {
  display: flex;
  flex-direction: column;
  justify-content: center;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，横线会空白。 */
  width: 100%;
  height: 100%;
}
</style>
