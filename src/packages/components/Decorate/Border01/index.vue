<template>
  <div ref="containerRef" class="decorate-border-box">
    <svg :width="w" :height="h">
      <polygon
        :fill="option.backgroundColor"
        :points="`10, 27 10, ${h - 27} 13, ${h - 24} 13, ${h - 21} 24, ${h - 11}
      38, ${h - 11} 41, ${h - 8} 73, ${h - 8} 75, ${h - 10} 81, ${h - 10}
      85, ${h - 6} ${w - 85}, ${h - 6} ${w - 81}, ${h - 10} ${w - 75}, ${h - 10}
      ${w - 73}, ${h - 8} ${w - 41}, ${h - 8} ${w - 38}, ${h - 11}
      ${w - 24}, ${h - 11} ${w - 13}, ${h - 21} ${w - 13}, ${h - 24}
      ${w - 10}, ${h - 27} ${w - 10}, 27 ${w - 13}, 25 ${w - 13}, 21
      ${w - 24}, 11 ${w - 38}, 11 ${w - 41}, 8 ${w - 73}, 8 ${w - 75}, 10
      ${w - 81}, 10 ${w - 85}, 6 85, 6 81, 10 75, 10 73, 8 41, 8 38, 11 24, 11 13, 21 13, 24`"
      />
    </svg>

    <svg
      :width="w"
      :height="h"
      :key="item"
      v-for="item in borders"
      :class="`border-item ${item}`"
    >
      <polygon
        :fill="option.colors[0]"
        points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63"
      >
        <animate
          attributeName="fill"
          :values="`${option.colors[0]};${option.colors[1]};${option.colors[0]}`"
          :dur="`${option.dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="option.colors[1]"
        points="27.599999999999998,4.8 38.4,4.8 35.4,7.8 30.599999999999998,7.8"
      >
        <animate
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[0]};${option.colors[1]}`"
          :dur="`${option.dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="option.colors[0]"
        points="9,54 9,63 7.199999999999999,66 7.199999999999999,75 7.8,78 7.8,110 8.4,110 8.4,66 9.6,66 9.6,54"
      >
        <animate
          attributeName="fill"
          :values="`${option.colors[0]};${option.colors[1]};transparent`"
          :dur="`${option.dur + 1}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder01' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

const borders = ['left-top', 'right-top', 'left-bottom', 'right-bottom']
</script>

<style scoped>
/* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，边框 SVG 会空白。 */
.decorate-border-box {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-box .border-item {
  position: absolute;
  top: 0;
  left: 0;
}
.decorate-border-box .right-top {
  right: 0;
  transform: rotateY(180deg);
}
.decorate-border-box .left-bottom {
  bottom: 0;
  transform: rotateX(180deg);
}
.decorate-border-box .right-bottom {
  right: 0;
  bottom: 0;
  transform: rotateX(180deg) rotateY(180deg);
}
</style>
