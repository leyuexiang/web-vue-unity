<template>
  <!-- 标题继承所选字体，不改变两侧装饰图形。 -->
  <div class="decorate-03" :style="{ fontFamily: option.fontFamily || undefined }">
    <svg :width="20" :height="20">
      <polyline
        stroke-width="4"
        fill="transparent"
        :stroke="option.colors[0]"
        points="10, 0 19, 10 10, 20"
      />
      <polyline
        stroke-width="2"
        fill="transparent"
        :stroke="option.colors[1]"
        points="2, 0 11, 10 2, 20"
      />
    </svg>
    <span :style="`color: ${option.textColor};font-size: ${option.textSize}px`">
      {{ option.dataset }}
    </span>
    <svg :width="20" :height="20">
      <polyline
        stroke-width="4"
        fill="transparent"
        :stroke="option.colors[0]"
        points="11, 0 2, 10 11, 20"
      />
      <polyline
        stroke-width="2"
        fill="transparent"
        :stroke="option.colors[1]"
        points="19, 0 10, 10 19, 20"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VDecorate03' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
.decorate-03 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.decorate-03 span {
  flex: 1;
  text-align: center;
}
</style>
