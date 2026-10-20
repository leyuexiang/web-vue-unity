<template>
  <div class="scene-edit-resource-content">
    <!-- 搜索入口固定在资源面板顶部，长资源列表只滚动下方内容。 -->
    <div class="scene-edit-resource-search">
      <el-input
        v-model.trim="searchValue"
        @input="handleSearch"
        placeholder="搜索"
        :prefix-icon="Search"
        clearable
      />
    </div>
    <el-scrollbar class="scene-edit-resource-scroll">
      <div class="scene-edit-resource-groups">
        <el-collapse v-model="activeNames" expand-icon-position="left">
          <el-collapse-item
            :title="item.name"
            :name="item.key"
            v-for="item in collapseList"
            :key="item.key"
          >
            <div class="scene-edit-resource-grid">
              <div
                :title="base.name"
                draggable="true"
                @dragstart="() => onDragStart(base as unknown as EditorSceneObjectModel)"
                @dragend="onDragEnd"
                v-for="base in item.children"
                :key="base.id"
                class="scene-edit-resource-card"
              >
                <img
                  :src="base.icon"
                  class="scene-edit-resource-card__image select-none"
                  draggable="false"
                  @dragstart.prevent
                  @drag.prevent
                />
                <span class="scene-edit-resource-card__name">
                  {{ base.name }}
                </span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import {
  billboardComponentDataList,
  customDataList,
  WidgetDataList,
} from '@/config/leftDragDataList'
import { filterDataList } from '@/utils/utils'
import type { EditorSceneObjectModel } from '@/scene-platform'
import type { EffectDragItem } from '@/types/threeScene'
import { ref, getCurrentInstance } from 'vue'
import { cloneDeep, throttle } from 'lodash-es'

import { MITT_ON_KEY_ENUM } from '@/enums/index'

const { $eventBus } = getCurrentInstance()?.proxy || {}

const searchValue = ref('')

const componentWidgetDataList = [
  ...billboardComponentDataList.map((item) => ({ ...item, key: `component-${item.key}` })),
  ...customDataList.map((item) => ({ ...item, key: `component-${item.key}` })),
  ...WidgetDataList.map((item) => ({ ...item, key: `widget-${item.key}` })),
]

const collapseList = ref(cloneDeep(componentWidgetDataList))

// 默认展开所有折叠项
const activeNames = ref(componentWidgetDataList.map((item) => item.key))

const handleSearch = throttle(() => {
  collapseList.value = filterDataList(searchValue.value, componentWidgetDataList)
  // 更新展开状态，只展开过滤后的项目
  activeNames.value = collapseList.value.map((item) => item.key)
}, 500)

// 拖拽开始
/**
 * 组件页同时承载三维看板、打点和二维部件，不能再误标为 GeometryModel。
 * 统一按编辑器可序列化拖拽模型发送，SceneCanvas 再依据 modelType 路由到三维或 DOM 创建链路。
 */
const onDragStart = (item: EditorSceneObjectModel | EffectDragItem) => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_START, item)
}

const onDragEnd = () => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL)
}
</script>
