<template>
  <div
    class="gold-border"
    :style="{ borderImageSource: `url(${borderImage})` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import type Config from './config'
import borderImage from '../assets/images/solid-blurred-gold-border.png'

defineOptions({ name: 'VBorderSolidBlurredGold' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
.gold-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 12px solid transparent;

  /* 原图四角各保留 12px；仅拉伸四边和中央的纯色区域。 */
  border-image-slice: 12 fill;
  border-image-width: 12px;
  border-image-repeat: stretch;
}
</style>
