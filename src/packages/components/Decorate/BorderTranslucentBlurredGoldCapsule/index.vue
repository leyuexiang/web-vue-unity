<template>
  <div
    class="gold-glass-capsule-border"
    :style="{ borderImageSource: `url(${borderImage})` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import type Config from './config'
import borderImage from '../assets/images/translucent-blurred-gold-capsule-border.png'

defineOptions({ name: 'VBorderTranslucentBlurredGoldCapsule' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
.gold-glass-capsule-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 14px solid transparent;
  border-right-width: 16px;
  border-left-width: 16px;
  border-radius: 15px;

  /* 保留两端 16px 和上下弧线 14px，仅伸缩中央的直线与填充。 */
  border-image-slice: 14 16 fill;
  border-image-width: 14px 16px;
  border-image-repeat: stretch;

  /* 圆角同时约束模糊区域，不会模糊胶囊外的透明角。 */
  backdrop-filter: blur(3px);
}
</style>
