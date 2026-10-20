<template>
  <div ref="containerRef" class="decorate-border-02">
    <svg :width="w" :height="h">
      <!-- 边框外形 -->
      <path
        :fill="option.backgroundColor"
        :stroke="option.colors[0]"
        :d="`
          M 5 20 L 5 10 L 12 3  L 60 3 L 68 10
          L ${w - 20} 10 L ${w - 5} 25
          L ${w - 5} ${h - 5} L 20 ${h - 5}
          L 5 ${h - 20} L 5 20
        `"
      />

      <!-- 顶部虚线装饰 -->
      <path
        fill="transparent"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="10, 5"
        :stroke="option.colors[0]"
        d="M 16 9 L 61 9"
      />

      <!-- 左上角装饰线 -->
      <path
        fill="transparent"
        :stroke="option.colors[1]"
        d="M 5 20 L 5 10 L 12 3  L 60 3 L 68 10"
      />

      <!-- 右下角装饰线随组件尺寸计算；动态绑定必须使用模板字符串，避免把插值原文交给矢量路径解析器。 -->
      <path
        fill="transparent"
        :stroke="option.colors[1]"
        :d="`M ${w - 5} ${h - 30} L ${w - 5} ${h - 5} L ${w - 30} ${h - 5}`"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder02' })

defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)
</script>

<style scoped>
.decorate-border-02 {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
