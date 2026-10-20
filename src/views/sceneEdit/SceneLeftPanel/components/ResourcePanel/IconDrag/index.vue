<template>
  <div class="scene-edit-resource-content">
    <!-- 搜索入口固定在资源面板顶部，长资源列表只滚动下方内容。 -->
    <div class="scene-edit-resource-search">
      <el-input v-model.trim="searchValue" placeholder="搜索图标" :prefix-icon="Search" clearable />
    </div>

    <el-scrollbar class="scene-edit-resource-scroll">
      <!-- 图标资源与模型、组件、图表共用同一折叠分类骨架，不再维护独立单选筛选样式。 -->
      <div class="scene-edit-resource-groups">
        <el-collapse v-model="activeNames" expand-icon-position="left">
          <el-collapse-item
            v-for="group in filteredIconGroups"
            :key="group.value"
            :name="group.value"
            :title="group.label"
          >
            <div class="scene-edit-resource-grid">
              <div
                v-for="item in group.children"
                :key="item.name"
                :title="item.name"
                draggable="true"
                class="scene-edit-resource-card icon-drag-card"
                @dragstart="() => onDragStart(item)"
                @dragend="onDragEnd"
              >
                <component :is="item.component" class="icon-drag-card__icon" />
                <span class="scene-edit-resource-card__name">{{ item.title }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-empty v-if="filteredIconGroups.length === 0" description="暂无匹配图标" />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { DRAG_MODEL_ENUM, MITT_ON_KEY_ENUM } from '@/enums'
import type { WidgetModel } from '@/types/threeScene'
import {
  GOVIEW_ICON_CATEGORY_OPTIONS,
  GOVIEW_ICON_LIST,
  type GoviewIconItem,
} from '@/packages/components/Widget/Icon/iconCatalog'
import { createGoviewIconPreset } from '@/packages/components/Widget/Icon/iconRuntime'

defineOptions({ name: 'IconDrag' })

const { $eventBus } = getCurrentInstance()?.proxy || {}

const searchValue = ref('')
/** “全部”只属于旧单选筛选入口；折叠栏只渲染具有真实成员关系的业务分类。 */
const iconCategories = GOVIEW_ICON_CATEGORY_OPTIONS.filter((item) => item.value !== 'all')
const activeNames = ref<string[]>(iconCategories[0] ? [iconCategories[0].value] : [])

/**
 * 搜索时只遍历一次完整图标表，并通过 Map 直接写入对应分类。
 * 相比“每个折叠组各过滤一次”，该实现保持 O(图标数 + 分类数)，避免图标目录扩展后重复扫描。
 */
const filteredIconGroups = computed(() => {
  const keyword = searchValue.value.trim().toLowerCase()
  const groupedIcons = new Map<string, GoviewIconItem[]>(
    iconCategories.map((category) => [category.value, []]),
  )

  for (const item of GOVIEW_ICON_LIST) {
    const matchedKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.title.toLowerCase().includes(keyword) ||
      item.categoryName.toLowerCase().includes(keyword)
    if (!matchedKeyword) continue

    groupedIcons.get(item.category)?.push(item)
  }

  return iconCategories
    .map((category) => ({
      ...category,
      children: groupedIcons.get(category.value) ?? [],
    }))
    .filter((group) => group.children.length > 0)
})

/** 搜索结果自动展开命中的分类，避免用户看到分类标题却误以为没有匹配图标。 */
watch(searchValue, (keyword) => {
  if (!keyword.trim()) return
  activeNames.value = filteredIconGroups.value.map((group) => group.value)
})

const buildIconWidgetModel = (item: GoviewIconItem): WidgetModel => ({
  name: item.title,
  modelType: DRAG_MODEL_ENUM.Widget,
  icon: '',
  packageName: 'Widget',
  keyName: 'VIcon',
  /**
   * 每张图标卡片只携带轻量预设。
   * 真正的组件、属性面板和数据链路仍复用同一个 `VIcon`，避免 125 个图标生成 125 套组件目录。
   */
  preset: createGoviewIconPreset(item.name),
})

const onDragStart = (item: GoviewIconItem) => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_START, buildIconWidgetModel(item))
}

const onDragEnd = () => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL)
}
</script>

<style scoped lang="scss">
.icon-drag-card {
  color: rgb(255 255 255 / 60%);
}
.icon-drag-card:hover {
  color: rgb(255 255 255 / 100%);
}
.icon-drag-card__icon {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  padding: 6px;
  color: currentcolor;
  background: #121b26;
  opacity: 0.6;
}
.icon-drag-card:hover .icon-drag-card__icon {
  opacity: 1;
}
</style>
