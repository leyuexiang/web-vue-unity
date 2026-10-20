<template>
  <div ref="containerRef" class="decorate-border-08">
    <svg :width="w" :height="h">
      <defs>
        <!-- 边框描边路径：后面会被 <use> 复用两次，分别画底线和流光线。 -->
        <path :id="path" :d="pathD" fill="transparent" />

        <!-- 径向渐变：给移动的光点提供中心亮、边缘透明的视觉效果。 -->
        <radialGradient :id="gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>

        <!-- 遮罩：让圆形光点沿矩形路径运动，只保留路径附近的可见区域。 -->
        <mask :id="mask">
          <circle cx="0" cy="0" r="150" :fill="`url(#${gradient})`">
            <animateMotion
              :dur="`${option.dur}s`"
              :path="pathD"
              rotate="auto"
              repeatCount="indefinite"
            />
          </circle>
        </mask>
      </defs>

      <!-- 背景：保持原版透明底色逻辑，避免把图形层压成一整块。 -->
      <polygon
        :fill="option.backgroundColor"
        :points="`5, 5 ${w - 5}, 5 ${w - 5} ${h - 5} 5, ${h - 5}`"
      />

      <!-- 底层描边：提供更稳定的边框基线。 -->
      <use :href="`#${path}`" :xlink:href="`#${path}`" :stroke="option.colors[0]" stroke-width="1" />

      <!-- 流光描边：保留原版“扫描光”效果。 -->
      <use
        :href="`#${path}`"
        :xlink:href="`#${path}`"
        :stroke="option.colors[1]"
        stroke-width="3"
        :mask="`url(#${mask})`"
      >
        <animate
          attributeName="stroke-dasharray"
          :from="`0, ${length}`"
          :to="`${length}, 0`"
          :dur="`${option.dur}s`"
          repeatCount="indefinite"
        />
      </use>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import Config from './config'

defineOptions({ name: 'VBorder08' })

const props = defineProps<{ option: Config['option'] }>()

const containerRef = ref<HTMLElement>()
const { width: w, height: h } = useElementSize(containerRef)

/** 生成唯一 ID，避免多个边框实例相互冲突。 */
const path = `border-box-08-path-${Math.random().toString(36).slice(2, 8)}`
const gradient = `border-box-08-gradient-${Math.random().toString(36).slice(2, 8)}`
const mask = `border-box-08-mask-${Math.random().toString(36).slice(2, 8)}`

/** 路径总长度 */
const length = computed(() => {
  return (w.value + h.value - 5) * 2
})

/** 根据方向生成矩形运动路径 */
const pathD = computed(() => {
  // 这里必须从 props 读取，不能直接写 `option`。
  // 之前这里会在 setup 阶段触发未定义引用，导致组件直接空白。
  if (props.option.reverse) {
    // 反向时保持与原版一致的矩形回路，只是换成逆时针走向。
    return `M 2.5, 2.5 L 2.5, ${h.value - 2.5} L ${w.value - 2.5}, ${h.value - 2.5} L ${w.value - 2.5}, 2.5 L 2.5, 2.5`
  }
  // 默认方向：按顺时针绘制，配合光点遮罩形成原版扫描边框效果。
  return `M2.5, 2.5 L${w.value - 2.5}, 2.5 L${w.value - 2.5}, ${h.value - 2.5} L2.5, ${h.value - 2.5} L2.5, 2.5`
})
</script>

<style scoped>
.decorate-border-08 {
  position: relative;

  /* 根节点必须填满画布卡片，否则 useElementSize 会量到 0，边框路径会空白。 */
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.decorate-border-08 svg {
  /* SVG 默认是行内元素，明确设为块级可以避免基线布局带来的额外空隙。 */
  display: block;
}
</style>
