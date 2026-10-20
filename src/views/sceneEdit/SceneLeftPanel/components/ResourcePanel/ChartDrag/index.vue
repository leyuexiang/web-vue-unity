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
            v-for="item in collapseList"
            :key="item.key"
            :title="item.name"
            :name="item.key"
          >
            <div class="scene-edit-resource-grid">
              <div
                v-for="chart in item.children"
                :key="chart.id"
                draggable="true"
                :title="chart.name"
                class="scene-edit-resource-card"
                @dragstart="() => onDragStart(chart as unknown as GeometryModel)"
                @dragend="onDragEnd"
              >
                <img
                  :src="chart.icon"
                  class="scene-edit-resource-card__image select-none"
                  draggable="false"
                  @dragstart.prevent
                  @drag.prevent
                />
                <span class="scene-edit-resource-card__name">
                  {{ chart.name }}
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
import { ChartDataList } from '@/config/leftDragDataList'
import { filterDataList } from '@/utils/utils'
import type { GeometryModel } from '@/types/threeScene'
import { cloneDeep, throttle } from 'lodash-es'
import { getCurrentInstance, ref } from 'vue'
import { MITT_ON_KEY_ENUM } from '@/enums'

defineOptions({ name: 'ChartDrag' })

const { $eventBus } = getCurrentInstance()?.proxy || {}

const searchValue = ref('')
const collapseList = ref(cloneDeep(ChartDataList))
const activeNames = ref(ChartDataList.map((item) => item.key))

const handleSearch = throttle(() => {
  collapseList.value = filterDataList(searchValue.value, ChartDataList)
  activeNames.value = collapseList.value.map((item) => item.key)
}, 500)

const onDragStart = (item: GeometryModel) => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_START, item)
}

const onDragEnd = () => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL)
}
</script>
