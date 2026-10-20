<template>
  <div ref="containerRef" class="decorate-border-07">
    <svg :width="w" :height="h">
      <defs>
        <!-- 线性渐变，带坐标动画 -->
        <linearGradient :id="filterId" x1="0%" y1="0%" x2="100%" y2="100%">
          <animate
            attributeName="x1"
            values="0%;100%;0%"
            dur="10s"
            begin="0s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="x2"
            values="100%;0%;100%"
            dur="10s"
            begin="0s"
            repeatCount="indefinite"
          />
          <stop offset="0%" :stop-color="option.colors[0]">
            <animate
              attributeName="stop-color"
              :values="`${option.colors[0]};${option.colors[1]};${option.colors[0]}`"
              dur="10s"
              begin="0s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" :stop-color="option.colors[1]">
            <animate
              attributeName="stop-color"
              :values="`${option.colors[1]};${option.colors[0]};${option.colors[1]}`"
              dur="10s"
              begin="0s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        <!-- 遮罩 -->
        <mask :id="maskId">
          <polyline
            stroke="#fff"
            stroke-width="3"
            fill="transparent"
            :points="`8, ${h * 0.4} 8, 3, ${w * 0.4 + 7}, 3`"
          />
          <polyline
            fill="#fff"
            :points="`
              8, ${h * 0.15} 8, 3, ${w * 0.1 + 7}, 3
              ${w * 0.1}, 8 14, 8 14, ${h * 0.15 - 7}
            `"
          />

          <polyline
            stroke="#fff"
            stroke-width="3"
            fill="transparent"
            :points="`${w * 0.5}, 3 ${w - 3}, 3, ${w - 3}, ${h * 0.25}`"
          />
          <polyline
            fill="#fff"
            :points="`
              ${w * 0.52}, 3 ${w * 0.58}, 3
              ${w * 0.58 - 7}, 9 ${w * 0.52 + 7}, 9
            `"
          />
          <polyline
            fill="#fff"
            :points="`
              ${w * 0.9}, 3 ${w - 3}, 3 ${w - 3}, ${h * 0.1}
              ${w - 9}, ${h * 0.1 - 7} ${w - 9}, 9 ${w * 0.9 + 7}, 9
            `"
          />

          <polyline
            stroke="#fff"
            stroke-width="3"
            fill="transparent"
            :points="`8, ${h * 0.5} 8, ${h - 3} ${w * 0.3 + 7}, ${h - 3}`"
          />
          <polyline
            fill="#fff"
            :points="`
              8, ${h * 0.55} 8, ${h * 0.7}
              2, ${h * 0.7 - 7} 2, ${h * 0.55 + 7}
            `"
          />

          <polyline
            stroke="#fff"
            stroke-width="3"
            fill="transparent"
            :points="`${w * 0.35}, ${h - 3} ${w - 3}, ${h - 3} ${w - 3}, ${h * 0.35}`"
          />
          <polyline
            fill="#fff"
            :points="`
              ${w * 0.92}, ${h - 3} ${w - 3}, ${h - 3} ${w - 3}, ${h * 0.8}
              ${w - 9}, ${h * 0.8 + 7} ${w - 9}, ${h - 9} ${w * 0.92 + 7}, ${h - 9}
            `"
          />
        </mask>
      </defs>

      <!-- 背景多边形 -->
      <polygon :fill="option.backgroundColor" :points="`
        15, 9 ${w * 0.1 + 1}, 9 ${w * 0.1 + 4}, 6 ${w * 0.52 + 2}, 6
        ${w * 0.52 + 6}, 10 ${w * 0.58 - 7}, 10 ${w * 0.58 - 2}, 6
        ${w * 0.9 + 2}, 6 ${w * 0.9 + 6}, 10 ${w - 10}, 10 ${w - 10}, ${h * 0.1 - 6}
        ${w - 6}, ${h * 0.1 - 1} ${w - 6}, ${h * 0.8 + 1} ${w - 10}, ${h * 0.8 + 6}
        ${w - 10}, ${h - 10} ${w * 0.92 + 7}, ${h - 10}  ${w * 0.92 + 2}, ${h - 6}
        11, ${h - 6} 11, ${h * 0.15 - 2} 15, ${h * 0.15 - 7}
      `"/>

      <!-- 渐变填充 + 遮罩 -->
      <rect x="0" y="0" :width="w" :height="h" :fill="`url(#${filterId})`" :mask="`url(#${maskId})`"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder07' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

/** 生成唯一 ID，避免多实例冲突 */
const filterId = `border-box-07-filter-${Math.random().toString(36).slice(2, 8)}`
const maskId = `border-box-07-mask-${Math.random().toString(36).slice(2, 8)}`
</script>

<style scoped>
.decorate-border-07 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
