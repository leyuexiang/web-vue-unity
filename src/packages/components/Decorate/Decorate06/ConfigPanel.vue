<template>
  <div>
    <!-- 字体候选项与页面分页器共用；未配置时保留原有继承字体。 -->
    <setting-item-box name="标题字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" size="small" placeholder="默认字体">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="内容" :alone="true">
      <ScenePropertyInput v-model="option.dataset" placeholder="请输入标题" />
    </setting-item-box>

    <setting-item-box name="文字颜色" :alone="true">
      <!-- 颜色控件统一复用右侧属性共享组件；外层行已有标签，所以采用独立色块变体。 -->
      <ScenePropertyColorPicker v-model="option.textColor" label="文字颜色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="文字大小" :alone="true">
      <ScenePropertyNumberInput v-model="option.textSize" :min="12" :max="72" size="small" />
    </setting-item-box>

    <!-- 颜色项继续保持独立，但不再包一层内层标签。 -->
    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <ScenePropertyColorPicker
        v-model="option.colors[index]"
        :label="`颜色-${index + 1}`"
        variant="swatch"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'
import ScenePropertyColorPicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'

defineOptions({ name: 'VDecorate06ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
