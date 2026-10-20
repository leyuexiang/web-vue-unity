<template>
  <div ref="containerRef" class="decorate-border-04">
    <svg :width="w" :height="h">
      <!-- 滤镜定义：发光效果 -->
      <defs>
        <filter :id="filterId" height="150%" width="150%" x="-25%" y="-25%">
          <feMorphology operator="dilate" radius="2" in="SourceAlpha" result="thicken" />
          <feGaussianBlur in="thicken" stdDeviation="3" result="blurred" />
          <feFlood :flood-color="option.colors[1]" result="glowColor" />
          <feComposite in="glowColor" in2="blurred" operator="in" result="softGlowColored" />
          <feMerge>
            <feMergeNode in="softGlowColored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 背景多边形 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`
        20, 32 ${w * 0.5 - option.borderTitleWidth / 2}, 32 ${w * 0.5 - option.borderTitleWidth / 2 + 20}, 53
        ${w * 0.5 + option.borderTitleWidth / 2 - 20}, 53 ${w * 0.5 + option.borderTitleWidth / 2}, 32
        ${w - 20}, 32 ${w - 8}, 48 ${w - 8}, ${h - 25} ${w - 20}, ${h - 8}
        20, ${h - 8} 8, ${h - 25} 8, 50
      `"
      />

      <!-- 边框主体线条 -->
      <polyline
        :fill="option.backgroundColor"
        :stroke="option.colors[0]"
        :filter="`url(#${filterId})`"
        :points="`
          ${(w - option.borderTitleWidth) / 2}, 30
          20, 30 7, 50 7, ${50 + (h - 167) / 2}
          13, ${55 + (h - 167) / 2} 13, ${135 + (h - 167) / 2}
          7, ${140 + (h - 167) / 2} 7, ${h - 27}
          20, ${h - 7} ${w - 20}, ${h - 7} ${w - 7}, ${h - 27}
          ${w - 7}, ${140 + (h - 167) / 2} ${w - 13}, ${135 + (h - 167) / 2}
          ${w - 13}, ${55 + (h - 167) / 2} ${w - 7}, ${50 + (h - 167) / 2}
          ${w - 7}, 50 ${w - 20}, 30 ${(w + option.borderTitleWidth) / 2}, 30
          ${(w + option.borderTitleWidth) / 2 - 20}, 7 ${(w - option.borderTitleWidth) / 2 + 20}, 7
          ${(w - option.borderTitleWidth) / 2}, 30 ${(w - option.borderTitleWidth) / 2 + 20}, 52
          ${(w + option.borderTitleWidth) / 2 - 20}, 52 ${(w + option.borderTitleWidth) / 2}, 30
        `"
      />

      <!-- 标题右侧装饰三角 -->
      <polygon
        :stroke="option.colors[0]"
        fill="transparent"
        :points="`
          ${(w + option.borderTitleWidth) / 2 - 5}, 30 ${(w + option.borderTitleWidth) / 2 - 21}, 11
          ${(w + option.borderTitleWidth) / 2 - 27}, 11 ${(w + option.borderTitleWidth) / 2 - 8}, 34
        `"
      />

      <!-- 标题左侧装饰三角 -->
      <polygon
        :stroke="option.colors[0]"
        fill="transparent"
        :points="`
          ${(w - option.borderTitleWidth) / 2 + 5}, 30 ${(w - option.borderTitleWidth) / 2 + 22}, 49
          ${(w - option.borderTitleWidth) / 2 + 28}, 49 ${(w - option.borderTitleWidth) / 2 + 8}, 26
        `"
      />

      <!-- 标题区域菱形 -->
      <polygon
        :stroke="option.colors[0]"
        :fill="option.colors[1]"
        :filter="`url(#${filterId})`"
        :points="`
          ${(w + option.borderTitleWidth) / 2 - 11}, 37 ${(w + option.borderTitleWidth) / 2 - 32}, 11
          ${(w - option.borderTitleWidth) / 2 + 23}, 11 ${(w - option.borderTitleWidth) / 2 + 11}, 23
          ${(w - option.borderTitleWidth) / 2 + 33}, 49 ${(w + option.borderTitleWidth) / 2 - 22}, 49
        `"
      />

      <!-- 标题左侧装饰条 1（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="1"
        :points="`
          ${(w - option.borderTitleWidth) / 2 - 10}, 37 ${(w - option.borderTitleWidth) / 2 - 31}, 37
          ${(w - option.borderTitleWidth) / 2 - 25}, 46 ${(w - option.borderTitleWidth) / 2 - 4}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="1;0.7;1"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 标题左侧装饰条 2（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="0.7"
        :points="`
          ${(w - option.borderTitleWidth) / 2 - 40}, 37 ${(w - option.borderTitleWidth) / 2 - 61}, 37
          ${(w - option.borderTitleWidth) / 2 - 55}, 46 ${(w - option.borderTitleWidth) / 2 - 34}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="0.7;0.4;0.7"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 标题左侧装饰条 3（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="0.5"
        :points="`
          ${(w - option.borderTitleWidth) / 2 - 70}, 37 ${(w - option.borderTitleWidth) / 2 - 91}, 37
          ${(w - option.borderTitleWidth) / 2 - 85}, 46 ${(w - option.borderTitleWidth) / 2 - 64}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="0.5;0.2;0.5"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 标题右侧装饰条 1（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="1"
        :points="`
          ${(w + option.borderTitleWidth) / 2 + 30}, 37 ${(w + option.borderTitleWidth) / 2 + 9}, 37
          ${(w + option.borderTitleWidth) / 2 + 3}, 46 ${(w + option.borderTitleWidth) / 2 + 24}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="1;0.7;1"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 标题右侧装饰条 2（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="0.7"
        :points="`
          ${(w + option.borderTitleWidth) / 2 + 60}, 37 ${(w + option.borderTitleWidth) / 2 + 39}, 37
          ${(w + option.borderTitleWidth) / 2 + 33}, 46 ${(w + option.borderTitleWidth) / 2 + 54}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="0.7;0.4;0.7"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 标题右侧装饰条 3（带透明度动画） -->
      <polygon
        :filter="`url(#${filterId})`"
        :fill="option.colors[0]"
        opacity="0.5"
        :points="`
          ${(w + option.borderTitleWidth) / 2 + 90}, 37 ${(w + option.borderTitleWidth) / 2 + 69}, 37
          ${(w + option.borderTitleWidth) / 2 + 63}, 46 ${(w + option.borderTitleWidth) / 2 + 84}, 46
        `"
      >
        <animate
          attributeName="opacity"
          values="0.5;0.2;0.5"
          dur="2s"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>

      <!-- 矢量标题文字独立应用字体，未设置时保留原有继承样式。 -->
      <text
        :x="`${w / 2}`"
        :y="option.borderTitleHeight"
        :fill="option.borderTitleColor"
        :font-size="option.borderTitleSize"
        :font-family="option.borderTitleFontFamily || undefined"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ option.borderTitle }}
      </text>

      <!-- 左侧竖条装饰 -->
      <polygon
        :fill="option.colors[0]"
        :filter="`url(#${filterId})`"
        :points="`
          7, ${53 + (h - 167) / 2} 11, ${57 + (h - 167) / 2}
          11, ${133 + (h - 167) / 2} 7, ${137 + (h - 167) / 2}
        `"
      />

      <!-- 右侧竖条装饰 -->
      <polygon
        :fill="option.colors[0]"
        :filter="`url(#${filterId})`"
        :points="`
          ${w - 7}, ${53 + (h - 167) / 2} ${w - 11}, ${57 + (h - 167) / 2}
          ${w - 11}, ${133 + (h - 167) / 2} ${w - 7}, ${137 + (h - 167) / 2}
        `"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder04' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

// 生成唯一滤镜 ID
const filterId = `border-box-04-filterId-${Math.random().toString(36).slice(2, 9)}`
</script>

<style scoped>
/* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，标题边框会空白。 */
.decorate-border-04 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
