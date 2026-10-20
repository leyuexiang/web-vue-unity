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
      <setting-item-box name="搜索字体" :alone="true">
        <ScenePropertySelect
          v-model="option.searchFontFamily"
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
      <setting-item-box name="分页字体" :alone="true">
        <ScenePropertySelect
          v-model="option.paginationFontFamily"
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

      <setting-item-box name="对齐方式" :alone="true">
        <ScenePropertySelect v-model="option.align" size="small">
          <el-option label="靠左" value="left" />
          <el-option label="居中" value="center" />
          <el-option label="靠右" value="right" />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="默认页码" :alone="true">
        <ScenePropertyNumberInput v-model="option.pagination.page" :min="1" size="small" />
      </setting-item-box>

      <setting-item-box name="每页数量" :alone="true">
        <ScenePropertySelect v-model="option.pagination.pageSize" size="small">
          <el-option
            v-for="item in pageSizeOptions"
            :key="item"
            :label="String(item)"
            :value="item"
          />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="表头名称" :alone="true">
        <ScenePropertyInput v-model="headerText" placeholder="英文逗号分隔" />
      </setting-item-box>

      <setting-item-box name="显示边框" :alone="true">
        <ScenePropertySwitch v-model="option.style.border" active-value="on" inactive-value="off" />
      </setting-item-box>

      <setting-item-box name="底部边框" :alone="true">
        <ScenePropertySwitch
          v-model="option.style.bottomBordered"
          active-value="on"
          inactive-value="off"
        />
      </setting-item-box>

      <setting-item-box name="列分割线" :alone="true">
        <ScenePropertySwitch v-model="columnLineVisible" />
      </setting-item-box>

      <setting-item-box name="行分割线" :alone="true">
        <ScenePropertySwitch v-model="rowLineVisible" />
      </setting-item-box>

      <setting-item-box name="斑马条纹" :alone="true">
        <ScenePropertySwitch
          v-model="option.style.striped"
          active-value="on"
          inactive-value="off"
        />
      </setting-item-box>

      <setting-item-box name="字体大小" :alone="true">
        <ScenePropertyNumberInput v-model="option.style.fontSize" :min="10" size="small" />
      </setting-item-box>

      <setting-item-box name="边框宽度" :alone="true">
        <ScenePropertyNumberInput v-model="option.style.borderWidth" :min="0" size="small" />
      </setting-item-box>

      <setting-item-box name="边框颜色" :alone="true">
        <ScenePropertyColorPicker v-model="option.style.borderColor" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="边框样式" :alone="true">
        <ScenePropertySelect v-model="option.style.borderStyle" size="small">
          <el-option label="实线边框" value="solid" />
          <el-option label="虚线边框" value="dashed" />
          <el-option label="点状边框" value="dotted" />
          <el-option label="双线边框" value="double" />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="表格搜索" :alone="true">
        <ScenePropertySwitch v-model="searchVisible" />
      </setting-item-box>
    </div>
  </TableConfigPanelShell>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { computed } from 'vue'
import type { PropType } from 'vue'
import Config from './config'
import { parseTextList } from '../shared/tableRuntime'
import TableConfigPanelShell from '../shared/TableConfigPanelShell.vue'

defineOptions({ name: 'VTablesBasicConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

const pageSizeOptions = [2, 5, 10, 15, 30]

const headerText = computed({
  get: () => props.option.dataset.dimensions.map((item) => item.title).join(','),
  set: (value: string) => {
    const titles = parseTextList(value)
    /**
     * 表头名称只更新现有列的标题，不改变 key。
     * key 仍然负责和数据行字段对应，避免用户改标题后表格取不到数据。
     */
    props.option.dataset.dimensions = props.option.dataset.dimensions.map((column, index) => ({
      ...column,
      title: titles[index] || column.title,
    }))
  },
})

const columnLineVisible = computed({
  get: () => props.option.style.singleLine === 'off',
  set: (value: boolean) => {
    props.option.style.singleLine = value ? 'off' : 'on'
  },
})

const rowLineVisible = computed({
  get: () => props.option.style.singleColumn === 'off',
  set: (value: boolean) => {
    props.option.style.singleColumn = value ? 'off' : 'on'
  },
})

const searchVisible = computed({
  get: () => props.option.inputShow !== 'none',
  set: (value: boolean) => {
    props.option.inputShow = value ? 'flex' : 'none'
  },
})
</script>
