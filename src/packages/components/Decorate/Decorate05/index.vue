<template>
  <div ref="containerRef" class="decorate-05">
    <svg :width="w" :height="h">
      <!-- 背景线 -->
      <polyline :stroke="option.colors[1]" stroke-width="2" :points="`0, ${h / 2} ${w}, ${h / 2}`" />

      <!-- 分段线条1 -->
      <polyline
        :stroke="option.colors[0]"
        stroke-width="2"
        :points="`5, ${h / 2} ${w * 0.2 - 3}, ${h / 2}`"
        :stroke-dasharray="`0, ${w * 0.2}`"
        fill="freeze"
      >
        <animate
          :id="animationId2"
          attributeName="stroke-dasharray"
          :values="`0, ${w * 0.2};${w * 0.2}, 0;`"
          :dur="option.dur"
          :begin="`${animationId1}.end`"
          fill="freeze"
        />
        <animate
          attributeName="stroke-dasharray"
          :values="`${w * 0.2}, 0;0, ${w * 0.2}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </polyline>

      <!-- 分段线条2 -->
      <polyline
        :stroke="option.colors[0]"
        stroke-width="2"
        :points="`${w * 0.2 + 3}, ${h / 2} ${w * 0.8 - 3}, ${h / 2}`"
        :stroke-dasharray="`0, ${w * 0.6}`"
      >
        <animate
          :id="animationId4"
          attributeName="stroke-dasharray"
          :values="`0, ${w * 0.6};${w * 0.6}, 0`"
          :dur="option.dur"
          :begin="`${animationId3}.end + 1s`"
          fill="freeze"
        />
        <animate
          attributeName="stroke-dasharray"
          :values="`${w * 0.6}, 0;0, ${w * 0.6}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </polyline>

      <!-- 分段线条3 -->
      <polyline
        :stroke="option.colors[0]"
        stroke-width="2"
        :points="`${w * 0.8 + 3}, ${h / 2} ${w - 5}, ${h / 2}`"
        :stroke-dasharray="`0, ${w * 0.2}`"
      >
        <animate
          :id="animationId6"
          attributeName="stroke-dasharray"
          :values="`0, ${w * 0.2};${w * 0.2}, 0`"
          :dur="option.dur"
          :begin="`${animationId5}.end + 1s`"
          fill="freeze"
        />
        <animate
          attributeName="stroke-dasharray"
          :values="`${w * 0.2}, 0;0, ${w * 0.3}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </polyline>

      <!-- 圆点1 -->
      <circle cx="2" :cy="h / 2" r="2" :fill="option.colors[1]">
        <animate
          :id="animationId1"
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[0]}`"
          :begin="`0s;${animationId7}.end`"
          dur="0.3s"
          fill="freeze"
        />
      </circle>

      <!-- 圆点2 -->
      <circle :cx="w * 0.2" :cy="h / 2" r="2" :fill="option.colors[1]">
        <animate
          :id="animationId3"
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[0]}`"
          :begin="`${animationId2}.end`"
          dur="0.3s"
          fill="freeze"
        />
        <animate
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[1]}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </circle>

      <!-- 圆点3 -->
      <circle :cx="w * 0.8" :cy="h / 2" r="2" :fill="option.colors[1]">
        <animate
          :id="animationId5"
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[0]}`"
          :begin="`${animationId4}.end`"
          dur="0.3s"
          fill="freeze"
        />
        <animate
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[1]}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </circle>

      <!-- 圆点4 -->
      <circle :cx="w - 2" :cy="h / 2" r="2" :fill="option.colors[1]">
        <animate
          :id="animationId7"
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[0]}`"
          :begin="`${animationId6}.end`"
          dur="0.3s"
          fill="freeze"
        />
        <animate
          attributeName="fill"
          :values="`${option.colors[1]};${option.colors[1]}`"
          dur="0.01s"
          :begin="`${animationId7}.end`"
          fill="freeze"
        />
      </circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VDecorate05' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

// 生成唯一动画 ID，避免多实例冲突
const uid = Math.random().toString(36).slice(2, 8)
const animationId1 = `d5ani1${uid}`
const animationId2 = `d5ani2${uid}`
const animationId3 = `d5ani3${uid}`
const animationId4 = `d5ani4${uid}`
const animationId5 = `d5ani5${uid}`
const animationId6 = `d5ani6${uid}`
const animationId7 = `d5ani7${uid}`
</script>

<style scoped>
.decorate-05 {
  position: relative;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，线条会空白。 */
  width: 100%;
  height: 100%;
}
</style>
