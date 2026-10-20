<template>
  <div
    ref="containerRef"
    class="decorate-border-05"
    :style="`box-shadow: inset 0 0 25px 3px ${option.colors[0]}`"
  >
    <!-- 背景多边形 -->
    <svg :width="w" :height="h">
      <polygon :fill="option.backgroundColor" :points="`
        4, 0 ${w - 4}, 0 ${w}, 4 ${w}, ${h - 4} ${w - 4}, ${h}
        4, ${h} 0, ${h - 4} 0, 4
      `"/>
    </svg>

    <!-- 四角装饰 -->
    <svg
      :width="w"
      :height="h"
      :key="item"
      v-for="item in borders"
      :class="`border-item ${item}`"
    >
      <polygon
        :fill="option.colors[1]"
        points="40, 0 5, 0 0, 5 0, 16 3, 19 3, 7 7, 3 35, 3"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder05' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

const borders = ['left-top', 'right-top', 'left-bottom', 'right-bottom']
</script>

<style scoped>
/* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，边框 SVG 会空白。 */
.decorate-border-05 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-05 .border-item {
  position: absolute;
  top: 0;
  left: 0;
}
.decorate-border-05 .right-top {
  right: 0;
  transform: rotateY(180deg);
}
.decorate-border-05 .left-bottom {
  bottom: 0;
  transform: rotateX(180deg);
}
.decorate-border-05 .right-bottom {
  right: 0;
  bottom: 0;
  transform: rotateX(180deg) rotateY(180deg);
}
</style>
