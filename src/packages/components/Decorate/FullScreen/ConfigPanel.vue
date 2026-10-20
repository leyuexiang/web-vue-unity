<template>
  <div>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="背景色" :alone="true">
      <ScenePropertyColorPicker v-model="option.bgColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="边框色" :alone="true">
      <ScenePropertyColorPicker v-model="option.borderColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="边框大小" :alone="true">
      <ScenePropertyNumberInput v-model="option.border" :min="0" :max="20" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VFullScreenConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
