<template>
  <svg
    class="title-divider"
    viewBox="0 0 341 2"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="标题分隔线"
  >
    <rect width="19" height="2" :fill="option.accentColor ?? '#00C6FF'" />
    <rect
      x="19"
      width="1"
      height="2"
      :fill="option.accentColor ?? '#00C6FF'"
      opacity="0.55"
    />
    <rect
      x="20"
      width="321"
      height="2"
      :fill="option.lineColor ?? 'rgba(214, 235, 255, 0.1)'"
    />
  </svg>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VDecorateTitleDivider' })
defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
.title-divider {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
