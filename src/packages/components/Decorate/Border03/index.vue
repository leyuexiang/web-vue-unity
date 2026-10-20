<template>
  <div ref="containerRef" class="decorate-border-03">
    <svg :width="w" :height="h">
      <!-- 滤镜定义：发光动画 -->
      <defs>
        <filter :id="filterId" height="150%" width="150%" x="-25%" y="-25%">
          <feMorphology
            operator="dilate"
            radius="1"
            in="SourceAlpha"
            result="thicken"
          />
          <feGaussianBlur in="thicken" stdDeviation="2" result="blurred" />
          <feFlood :flood-color="alphaColor(option.colors[1], 0.7)" result="glowColor">
            <animate
              attributeName="flood-color"
              :values="`
                ${alphaColor(option.colors[1], 0.7)};
                ${alphaColor(option.colors[1], 0.3)};
                ${alphaColor(option.colors[1], 0.7)};
              `"
              dur="3s"
              begin="0s"
              repeatCount="indefinite"
            />
          </feFlood>
          <feComposite
            in="glowColor"
            in2="blurred"
            operator="in"
            result="softGlowColored"
          />
          <feMerge>
            <feMergeNode in="softGlowColored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 主边框（圆角矩形） -->
      <path
        v-if="w && h"
        :fill="option.backgroundColor"
        stroke-width="2"
        :stroke="option.colors[0]"
        :d="`
          M15 5 L ${w - 15} 5 Q ${w - 5} 5, ${w - 5} 15
          L ${w - 5} ${h - 15} Q ${w - 5} ${h - 5}, ${w - 15} ${h - 5}
          L 15, ${h - 5} Q 5 ${h - 5} 5 ${h - 15} L 5 15
          Q 5 5 15 5
        `"
      />

      <!-- 左上角发光装饰线 -->
      <path
        stroke-width="2"
        fill="transparent"
        stroke-linecap="round"
        :filter="`url(#${filterId})`"
        :stroke="option.colors[1]"
        d="M 20 5 L 15 5 Q 5 5 5 15 L 5 20"
      />

      <!-- 右上角发光装饰线 -->
      <path
        stroke-width="2"
        fill="transparent"
        stroke-linecap="round"
        :filter="`url(#${filterId})`"
        :stroke="option.colors[1]"
        :d="`M ${w - 20} 5 L ${w - 15} 5 Q ${w - 5} 5 ${w - 5} 15 L ${w - 5} 20`"
      />

      <!-- 右下角发光装饰线 -->
      <path
        stroke-width="2"
        fill="transparent"
        stroke-linecap="round"
        :filter="`url(#${filterId})`"
        :stroke="option.colors[1]"
        :d="`
          M ${w - 20} ${h - 5} L ${w - 15} ${h - 5}
          Q ${w - 5} ${h - 5} ${w - 5} ${h - 15}
          L ${w - 5} ${h - 20}
        `"
      />

      <!-- 左下角发光装饰线 -->
      <path
        stroke-width="2"
        fill="transparent"
        stroke-linecap="round"
        :filter="`url(#${filterId})`"
        :stroke="option.colors[1]"
        :d="`
          M 20 ${h - 5} L 15 ${h - 5}
          Q 5 ${h - 5} 5 ${h - 15}
          L 5 ${h - 20}
        `"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder03' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

// 生成唯一滤镜 ID
const filterId = `border-box-03-filterId-${Math.random().toString(36).slice(2, 9)}`

// 将 hex 颜色转为带透明度的 rgba 格式
function alphaColor(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<style scoped>
/* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，边框 SVG 会空白。 */
.decorate-border-03 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
