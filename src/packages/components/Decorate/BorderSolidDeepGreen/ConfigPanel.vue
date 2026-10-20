<template>
  <!-- 图片边框没有独立可配置项；尺寸由公共属性面板维护。 -->
  <div />
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VBorderSolidDeepGreenConfigPanel' })

defineProps<{ option: Config['option'] }>()
</script>
