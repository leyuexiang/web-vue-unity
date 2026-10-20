<template>
  <div
    class="solid-deep-green-border"
    :style="{ borderImageSource: `url(${borderImage})` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import type Config from './config'

import borderImage from '../assets/images/solid-deep-green-border.png'

defineOptions({ name: 'VBorderSolidDeepGreen' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
/*
 * 1x 原图尺寸为 364 × 354。顶部和底部是用户标记的固定区域：
 * - 顶部 56px，包含上方两角和分割线；
 * - 底部 22px，包含下方两角；
 * - 左右 12px 保留四角切片，避免圆角随尺寸拉伸。
 *
 * border-image-slice 使用原图像素切片，border-image-width 使用相同的 CSS 像素宽度，
 * 所以改变组件宽高时，中间填充区域伸缩，上下两个标记区域不会被纵向压扁或拉长。
 */
.solid-deep-green-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;

  /* 不设置不透明背景，保留原图四角的透明凹口；中心深绿色由 border-image 的 fill 提供。 */
  background: transparent;
  border-color: transparent;
  border-style: solid;
  border-width: 56px 12px 22px;
  border-image-slice: 56 12 22 12 fill;
  border-image-width: 56px 12px 22px 12px;
  border-image-repeat: stretch;
}
</style>
