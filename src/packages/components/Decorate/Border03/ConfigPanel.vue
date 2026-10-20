<template>
  <div>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <ScenePropertyColorPicker v-model="option.colors[index]" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="背景" :alone="true">
      <ScenePropertyColorPicker v-model="option.backgroundColor" variant="swatch" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VBorder03ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>

<style scoped></style>
