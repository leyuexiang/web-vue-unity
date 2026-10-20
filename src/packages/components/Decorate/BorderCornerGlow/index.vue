<template>
  <!-- 背景模糊独立于绿色描边，调色不会改变固定深色渐变。 -->
  <div class="corner-glow-border">
    <div class="background-blur" />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="frame-svg"
      preserveAspectRatio="none"
      viewBox="0 0 670 546"
      fill="none"
    >
      <g :filter="'url(#' + outerId + ')'">
        <path
          d="M662.5 5.25V540.75H7V5.25H662.5Z"
          :stroke="option.color ?? '#4AC36A'"
          stroke-width="0.5"
        />
      </g>
      <path
        d="M662.5 7.25V538.75H7V7.25H662.5Z"
        :fill="'url(#' + backgroundId + ')'"
        :stroke="option.frameColor ?? '#05A256'"
        stroke-width="0.5"
      />
      <g :filter="'url(#' + glowId + ')'">
        <path
          d="M26.75 7H6.75V27 M642.75 7H662.75V27 M26.75 539H6.75V519 M642.75 539H662.75V519"
          :stroke="option.color ?? '#4AC36A'"
          stroke-width="1.5"
        />
      </g>
      <path
        d="M26.75 7H6.75V27 M642.75 7H662.75V27 M26.75 539H6.75V519 M642.75 539H662.75V519"
        :stroke="option.color ?? '#4AC36A'"
        stroke-width="1.5"
      />
      <defs>
        <filter
          :id="outerId"
          x="1.75"
          y="0"
          width="666"
          height="546"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter
          :id="glowId"
          x="0"
          y="0.25"
          width="669.5"
          height="545.5"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient
          :id="backgroundId"
          x1="334.75"
          y1="7.00013"
          x2="334.75"
          y2="539"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#1E1E1E" stop-opacity="0.6" />
          <stop offset="1" stop-color="#1E1E1E" stop-opacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>
<script setup lang="ts">
import { useId } from 'vue'
import type Config from './config'
defineOptions({ name: 'VBorderCornerGlow' })
defineProps<{ option: Config['option'] }>()
// 滤镜及渐变编号按实例隔离，多个边框分别改色不会串扰。
const instanceId = useId()
const outerId = instanceId + '-outer'
const glowId = instanceId + '-glow'
const backgroundId = instanceId + '-background'
</script>
<style scoped>
/* 静态图形由容器驱动，无尺寸监听或动画循环。 */
.corner-glow-border {
  position: relative;
  width: 100%;
  height: 100%;
}
.frame-svg {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

/* 模糊范围对应原图内部矩形；百分比保留四位小数，保留外侧发光留边。 */
.background-blur {
  position: absolute;
  top: 1.3278%;
  left: 1.0448%;
  width: 97.8358%;
  height: 97.3443%;
  backdrop-filter: blur(10px);
}
</style>
