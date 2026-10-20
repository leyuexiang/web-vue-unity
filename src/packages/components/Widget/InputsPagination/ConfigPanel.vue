<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="页码字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="翻页按钮字体" :alone="true">
      <ScenePropertySelect v-model="option.navFontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="当前页" :alone="true">
      <ScenePropertyNumberInput v-model="option.value" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="总数" :alone="true">
      <ScenePropertyNumberInput v-model="option.total" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="每页数量" :alone="true">
      <ScenePropertyNumberInput v-model="option.pageSize" :min="1" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VInputsPaginationConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
