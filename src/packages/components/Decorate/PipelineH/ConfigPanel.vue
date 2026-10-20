<template>
  <div>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="管道颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.o_color" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="水流颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.i_color" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="流向" :alone="true">
      <ScenePropertySelect v-model="option.line_class" size="small">
        <el-option label="正向" value="svg-ani-flow" />
        <el-option label="反向" value="svg-ani-flow-back" />
        <el-option label="停止" value="svg-ani-flow-stop" />
      </ScenePropertySelect>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VPipelineHConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
