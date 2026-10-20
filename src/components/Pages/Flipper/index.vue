<template>
  <div class="go-flipper" :class="[flipType, { go: isFlipping }]">
    <div class="digital front" :data-front="frontTextFromData"></div>
    <div class="digital back" :data-back="backTextFromData"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { FlipType } from './index'

const props = withDefaults(
  defineProps<{
    flipType?: FlipType
    count?: number | string
    duration?: number
    width?: number
    height?: number
    radius?: number
    frontColor?: string
    backColor?: string
    borderWidth?: number
  }>(),
  {
    flipType: 'down',
    count: 0,
    duration: 600,
    width: 60,
    height: 100,
    radius: 10,
    frontColor: '#ffffff',
    backColor: '#000000',
    borderWidth: 2,
  },
)

const isFlipping = ref(false)
const frontTextFromData = ref(props.count || 0)
const backTextFromData = ref(props.count || 0)

let timeoutId: ReturnType<typeof setTimeout> | null = null

/**
 * 翻牌只处理“上一帧”和“下一帧”的数字切换。
 * 这里保留旧项目的视觉结构，避免新项目里只剩单纯的文本跳变。
 */
const flip = async (front: string | number, back: string | number) => {
  if (isFlipping.value) {
    isFlipping.value = false
    if (timeoutId) clearTimeout(timeoutId)
    await nextTick()
    await flip(front, back)
    return
  }

  backTextFromData.value = back
  frontTextFromData.value = front
  isFlipping.value = true

  timeoutId = setTimeout(() => {
    isFlipping.value = false
    frontTextFromData.value = back
  }, props.duration)
}

watch(
  () => props.count,
  (newVal, oldVal) => {
    void flip(oldVal as string | number, newVal as string | number)
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
$front-color: v-bind('props.frontColor');
$back-color: v-bind('props.backColor');
$radius: v-bind('`${props.radius}px`');
$width: v-bind('`${props.width}px`');
$height: v-bind('`${props.height}px`');
$perspective: v-bind('`${props.height * 2}px`');
$border-width: v-bind('`${props.borderWidth * 2}px`');
$speed: v-bind('`${props.duration / 1000}s`');
$shadow-color: #000000;
$line-color: #4a9ef8;

@keyframes front-flip-down {
  0% {
    transform: perspective($perspective) rotateX(0deg);
  }
  100% {
    transform: perspective($perspective) rotateX(-180deg);
  }
}

@keyframes back-flip-down {
  0% {
    transform: perspective($perspective) rotateX(180deg);
  }
  100% {
    transform: perspective($perspective) rotateX(0deg);
  }
}

@keyframes front-flip-up {
  0% {
    transform: perspective($perspective) rotateX(0deg);
  }
  100% {
    transform: perspective($perspective) rotateX(180deg);
  }
}

@keyframes back-flip-up {
  0% {
    transform: perspective($perspective) rotateX(-180deg);
  }
  100% {
    transform: perspective($perspective) rotateX(0deg);
  }
}
.go-flipper {
  position: relative;
  display: inline-block;
  width: $width;
  height: $height;
  font-size: $width;
  line-height: $height;
  color: $front-color;
  text-align: center;
  background: $front-color;
  border-radius: $radius;
  box-shadow: 0 0 6px rgba($shadow-color, 0.5);
  &::after {
    position: absolute;
    inset: 0;
    z-index: 10;
    content: '';
    border-radius: $radius;
    box-shadow: inset 0 0 $border-width 0 $front-color;
  }
  .digital::before,
  .digital::after {
    position: absolute;
    right: 0;
    left: 0;
    box-sizing: border-box;
    overflow: hidden;
    content: '';
    background: $back-color;
  }
  .digital.front::before,
  .digital.front::after {
    content: attr(data-front) !important;
  }
  .digital.back::before,
  .digital.back::after {
    content: attr(data-back) !important;
  }
  .digital::before {
    top: 0;
    bottom: 50%;
    border-bottom: solid 1px rgba($line-color, 0.3);
    border-radius: $radius $radius 0 0;
  }
  .digital::after {
    top: 50%;
    bottom: 0;
    line-height: 0;
    border-radius: 0 0 $radius $radius;
  }
  &.down .front::before {
    z-index: 3;
  }
  &.down .back::after {
    z-index: 2;
    transform: perspective($perspective) rotateX(180deg);
    transform-origin: 50% 0%;
  }
  &.down .front::after,
  &.down .back::before {
    z-index: 1;
  }
  &.down.go .front::before {
    box-shadow: 0 -2px $border-width 0 $front-color;
    transform-origin: 50% 100%;
    animation: front-flip-down $speed ease-in-out both;
    backface-visibility: hidden;
  }
  &.down.go .back::after {
    box-shadow: 0 2px $border-width 0 $front-color;
    animation: back-flip-down $speed ease-in-out both;
    backface-visibility: hidden;
  }
  &.up .front::after {
    z-index: 3;
  }
  &.up .back::before {
    z-index: 2;
    transform: perspective($perspective) rotateX(-180deg);
    transform-origin: 50% 100%;
  }
  &.up .front::before,
  &.up .back::after {
    z-index: 1;
  }
  &.up.go .front::after {
    box-shadow: 0 2px $border-width 0 $front-color;
    transform-origin: 50% 0;
    animation: front-flip-up $speed ease-in-out both;
    backface-visibility: hidden;
  }
  &.up.go .back::before {
    box-shadow: 0 -2px $border-width 0 $front-color;
    animation: back-flip-up $speed ease-in-out both;
    backface-visibility: hidden;
  }
}
</style>
