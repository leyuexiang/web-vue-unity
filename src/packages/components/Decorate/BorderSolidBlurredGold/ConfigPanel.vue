<template>
  <!-- 原图确定颜色；宽高由公共属性面板调整。 -->
  <div />
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VBorderSolidBlurredGoldConfigPanel' })

defineProps<{ option: Config['option'] }>()
</script>
