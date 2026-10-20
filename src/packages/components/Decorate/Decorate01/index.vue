<template>
  <div ref="containerRef" class="decorate-01">
    <svg :width="w" :height="h">
      <rect :x="0" :y="h / 2" :width="w" :height="option.lineHeight" :fill="option.colors[0]">
        <animate
          attributeName="width"
          from="0"
          :to="w"
          :dur="`${option.dur}s`"
          calcMode="spline"
          keyTimes="0;1"
          keySplines=".42,0,.58,1"
          repeatCount="indefinite"
        />
      </rect>

      <rect :x="0" :y="h / 2" :width="option.endWidth" :height="option.lineHeight" :fill="option.colors[1]">
        <animate
          attributeName="x"
          from="0"
          :to="w"
          :dur="`${option.dur}s`"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.42,0,0.58,1"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VDecorate01' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-01 {
  display: flex;
  flex-direction: column;
  justify-content: center;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，线条会空白。 */
  width: 100%;
  height: 100%;
}
</style>
