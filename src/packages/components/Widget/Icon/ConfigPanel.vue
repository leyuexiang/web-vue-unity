<template>
  <div>
    <setting-item-box name="图标" :alone="true">
      <ScenePropertySelect v-model="selectedIconName" filterable>
        <el-option-group
          v-for="group in groupedIconOptions"
          :key="group.category"
          :label="group.categoryName"
        >
          <el-option
            v-for="item in group.children"
            :key="item.name"
            :label="item.title"
            :value="item.name"
          >
            <div class="icon-option">
              <component :is="item.component" class="icon-option__svg" />
              <span class="icon-option__name">{{ item.title }}</span>
            </div>
          </el-option>
        </el-option-group>
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.color" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="尺寸" :alone="true">
      <ScenePropertyNumberInput v-model="option.size" :min="1" :max="512" size="small" />
    </setting-item-box>

    <setting-item-box name="旋转" :alone="true">
      <ScenePropertySelect v-model="option.rotate" size="small">
        <el-option label="0°" :value="0" />
        <el-option label="90°" :value="1" />
        <el-option label="180°" :value="2" />
        <el-option label="270°" :value="3" />
      </ScenePropertySelect>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import Config from './config'
import {
  GOVIEW_ICON_CATEGORY_OPTIONS,
  GOVIEW_ICON_LIST,
  normalizeGoviewIconName,
  resolveGoviewIconItem,
  type GoviewIconCategoryKey,
} from './iconCatalog'

defineOptions({ name: 'VIconConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

const selectedIconName = computed({
  get() {
    return normalizeGoviewIconName(props.option.value || props.option.dataset)
  },
  set(value: string) {
    const safeIconName = normalizeGoviewIconName(value)
    const iconItem = resolveGoviewIconItem(safeIconName)

    /**
     * GoView 旧组件使用 dataset 表示图标名；当前数据面板映射使用 value。
     * 属性面板手动切换图标时两个字段同步写入，保证旧场景字段和新数据映射字段都能读到同一值。
     */
    props.option.dataset = safeIconName
    props.option.value = safeIconName
    props.option.label = iconItem?.title || safeIconName
  },
})

const groupedIconOptions = computed(() =>
  GOVIEW_ICON_CATEGORY_OPTIONS.filter(
    (item): item is { label: string; value: GoviewIconCategoryKey } => item.value !== 'all',
  ).map((category) => ({
    category: category.value,
    categoryName: category.label,
    children: GOVIEW_ICON_LIST.filter((item) => item.category === category.value),
  })),
)
</script>

<style scoped lang="scss">
.icon-option {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.icon-option__svg {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  color: #9ca3af;
}
.icon-option__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
