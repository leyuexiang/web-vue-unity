<template>
  <TableConfigPanelShell :option="option">
    <div>
      <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
      <setting-item-box name="表头字体" :alone="true">
        <ScenePropertySelect
          v-model="option.headerFontFamily"
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
      <setting-item-box name="内容字体" :alone="true">
        <ScenePropertySelect
          v-model="option.bodyFontFamily"
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
      <setting-item-box name="序号字体" :alone="true">
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

      <setting-item-box name="表行数" :alone="true">
        <ScenePropertyNumberInput v-model="option.rowNum" :min="1" size="small" />
      </setting-item-box>

      <setting-item-box name="轮播时间" :alone="true">
        <ScenePropertyNumberInput v-model="option.waitTime" :min="0.5" :step="0.5" size="small" />
      </setting-item-box>

      <setting-item-box name="表头高度" :alone="true">
        <ScenePropertyNumberInput v-model="option.headerHeight" :min="0" size="small" />
      </setting-item-box>

      <setting-item-box name="显示行号" :alone="true">
        <ScenePropertySwitch v-model="option.index" />
      </setting-item-box>

      <setting-item-box name="表头数据" :alone="true">
        <ScenePropertyInput v-model="headerText" placeholder="英文逗号分隔" />
      </setting-item-box>

      <setting-item-box name="列对齐" :alone="true">
        <ScenePropertyInput v-model="alignText" placeholder="left,center,right" />
      </setting-item-box>

      <setting-item-box name="列宽度" :alone="true">
        <ScenePropertyInput v-model="columnWidthText" placeholder="30,100,100" />
      </setting-item-box>

      <setting-item-box name="轮播方式" :alone="true">
        <ScenePropertySelect v-model="option.carousel" size="small">
          <el-option label="单条轮播" value="single" />
          <el-option label="整页轮播" value="page" />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="表头背景" :alone="true">
        <ScenePropertyColorPicker v-model="option.headerBGC" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="奇数行" :alone="true">
        <ScenePropertyColorPicker v-model="option.oddRowBGC" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="偶数行" :alone="true">
        <ScenePropertyColorPicker v-model="option.evenRowBGC" variant="swatch" />
      </setting-item-box>
    </div>
  </TableConfigPanelShell>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { computed } from 'vue'
import type { PropType } from 'vue'
import Config from './config'
import { parseNumberList, parseTextList } from '../shared/tableRuntime'
import type { TableAlign } from '../shared/tableTypes'
import TableConfigPanelShell from '../shared/TableConfigPanelShell.vue'

defineOptions({ name: 'VTableScrollBoardConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

const headerText = computed({
  get: () => props.option.header.join(','),
  set: (value: string) => {
    props.option.header = parseTextList(value)
  },
})

const alignText = computed({
  get: () => props.option.align.join(','),
  set: (value: string) => {
    /**
     * 对齐方式只接受表格组件支持的三种值。
     * 非法值直接过滤，避免运行时把 text-align 写成无效字符串。
     */
    props.option.align = parseTextList(value).filter((item): item is TableAlign =>
      ['left', 'center', 'right'].includes(item),
    )
  },
})

const columnWidthText = computed({
  get: () => props.option.columnWidth.join(','),
  set: (value: string) => {
    props.option.columnWidth = parseNumberList(value)
  },
})
</script>
