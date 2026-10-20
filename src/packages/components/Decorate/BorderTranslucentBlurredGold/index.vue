<template>
  <div
    class="gold-glass-border"
    :style="{ borderImageSource: `url(${borderImage})` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import type Config from './config'
import borderImage from '../assets/images/translucent-blurred-gold-border.png'

defineOptions({ name: 'VBorderTranslucentBlurredGold' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
.gold-glass-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 12px solid transparent;

  /* 固定四角原始像素尺寸；中间由原图 80% 不透明度的绿色填充。 */
  border-image-slice: 12 fill;
  border-image-width: 12px;
  border-image-repeat: stretch;

  /* 与带分割线装饰毛玻璃边框相同的宿主背景模糊。 */
  backdrop-filter: blur(3px);
}
</style>
