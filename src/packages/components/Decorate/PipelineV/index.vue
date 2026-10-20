<template>
  <div ref="containerRef" class="decorate-pipeline-v">
    <svg :width="w" :height="h">
      <line :x1="w / 2" :y1="0" :x2="w / 2" :y2="h" :stroke="option.o_color" :stroke-width="w" />
      <line :x1="w / 2" :y1="0" :x2="w / 2" :y2="h" :stroke="option.i_color" :stroke-width="w / 2" :class="option.line_class" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VPipelineV' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
/* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，管道线会空白。 */
.decorate-pipeline-v {
  width: 100%;
  height: 100%;
  font-size: 0;
}

/* 正向流动 */
.svg-ani-flow {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ani-flow 10s linear infinite;
  animation-fill-mode: forwards;
}

@keyframes ani-flow {
  from { stroke-dasharray: 10, 5; }
  to { stroke-dasharray: 13, 5; }
}

/* 停止流动 */
.svg-ani-flow-stop {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ani-flow-stop 10s linear infinite;
  animation-fill-mode: forwards;
}

@keyframes ani-flow-stop {
  from { stroke-dasharray: 10, 5; }
  to { stroke-dasharray: 10, 5; }
}

/* 反向流动 */
.svg-ani-flow-back {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ani-flow-back 10s linear infinite;
  animation-fill-mode: forwards;
}

@keyframes ani-flow-back {
  from { stroke-dasharray: 13, 5; }
  to { stroke-dasharray: 10, 5; }
}
</style>
