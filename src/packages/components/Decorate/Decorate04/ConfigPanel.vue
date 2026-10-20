<template>
  <div>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="方向" :alone="true">
      <ScenePropertySwitch v-model="option.reverse" active-text="反向" />
    </setting-item-box>

    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <ScenePropertyColorPicker v-model="option.colors[index]" variant="swatch" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VDecorate04ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
