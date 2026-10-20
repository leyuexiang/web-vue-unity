<template>
  <TableConfigPanelShell :option="option">
    <div>
      <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
      <setting-item-box name="排名字体" :alone="true">
        <ScenePropertySelect
          v-model="option.indexFontFamily"
          placeholder="沿用默认字体"
          size="small"
        >
          <el-option
            v-for="font in FONT_FAMILY_OPTIONS"
            :key="font.value"
            :label="font.label"
            :value="font.value"
          />
        </ScenePropertySelect>
      </setting-item-box>
      <setting-item-box name="名称字体" :alone="true">
        <ScenePropertySelect
          v-model="option.leftFontFamily"
          placeholder="沿用默认字体"
          size="small"
        >
          <el-option
            v-for="font in FONT_FAMILY_OPTIONS"
            :key="font.value"
            :label="font.label"
            :value="font.value"
          />
        </ScenePropertySelect>
      </setting-item-box>
      <setting-item-box name="数值字体" :alone="true">
        <ScenePropertySelect
          v-model="option.rightFontFamily"
          placeholder="沿用默认字体"
          size="small"
        >
          <el-option
            v-for="font in FONT_FAMILY_OPTIONS"
            :key="font.value"
            :label="font.label"
            :value="font.value"
          />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="表行数" :alone="true">
        <ScenePropertyNumberInput v-model="option.rowNum" :min="1" size="small" />
      </setting-item-box>

      <setting-item-box name="轮播时间" :alone="true">
        <ScenePropertyNumberInput v-model="option.waitTime" :min="0.5" :step="0.5" size="small" />
      </setting-item-box>

      <setting-item-box name="轮播方式" :alone="true">
        <ScenePropertySelect v-model="option.carousel" size="small">
          <el-option label="单条轮播" value="single" />
          <el-option label="整页轮播" value="page" />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="自动排序" :alone="true">
        <ScenePropertySwitch v-model="option.sort" />
      </setting-item-box>

      <setting-item-box name="数值单位" :alone="true">
        <ScenePropertyInput v-model="option.unit" placeholder="请输入单位" />
      </setting-item-box>

      <setting-item-box name="主体颜色" :alone="true">
        <ScenePropertyColorPicker v-model="option.color" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="数据颜色" :alone="true">
        <ScenePropertyColorPicker v-model="option.textColor" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="底部线条" :alone="true">
        <ScenePropertyColorPicker v-model="option.borderColor" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="序号字体" :alone="true">
        <ScenePropertyNumberInput v-model="option.indexFontSize" :min="10" size="small" />
      </setting-item-box>

      <setting-item-box name="左侧字体" :alone="true">
        <ScenePropertyNumberInput v-model="option.leftFontSize" :min="10" size="small" />
      </setting-item-box>

      <setting-item-box name="右侧字体" :alone="true">
        <ScenePropertyNumberInput v-model="option.rightFontSize" :min="10" size="small" />
      </setting-item-box>
    </div>
  </TableConfigPanelShell>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'
import TableConfigPanelShell from '../shared/TableConfigPanelShell.vue'

defineOptions({ name: 'VTableListConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
