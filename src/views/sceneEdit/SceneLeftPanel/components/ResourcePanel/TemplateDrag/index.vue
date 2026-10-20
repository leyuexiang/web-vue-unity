<template>
  <div class="scene-edit-resource-content">
    <div class="scene-edit-resource-search">
      <el-input
        v-model.trim="searchValue"
        placeholder="搜索模板"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
      />
    </div>

    <el-scrollbar class="scene-edit-resource-scroll">
      <div class="scene-edit-resource-groups">
        <el-collapse v-if="collapseList.length" v-model="activeNames" expand-icon-position="left">
          <el-collapse-item
            v-for="group in collapseList"
            :key="group.key"
            :title="group.name"
            :name="group.key"
          >
            <!--
              模板卡片采用 Figma 的横向封面规格，与模型等正方形资源卡片不同。
              独立网格类用于在资源面板宽度变化时自动调整列数，同时避免影响其他资源页。
            -->
            <div class="scene-edit-resource-grid scene-edit-resource-grid--template">
              <el-tooltip
                v-for="template in group.children"
                :key="template.id"
                :content="template.description || template.name"
                placement="top"
                :show-after="300"
              >
                <!-- 模板通过专用事件把轻量编号交给画布，确认前不会请求体积较大的四包详情。 -->
                <div
                  class="scene-edit-resource-card scene-edit-resource-card--template"
                  draggable="true"
                  @dragstart="() => onDragStart(template)"
                  @dragend="onDragEnd"
                >
                  <el-image
                    :src="template.coverUrl || errorImage"
                    class="scene-edit-resource-card__image"
                    fit="cover"
                  >
                    <template #error>
                      <img
                        :src="errorImage"
                        alt="模板封面加载失败"
                        draggable="false"
                        @dragstart.prevent
                        @drag.prevent
                        class="scene-edit-resource-card__fallback"
                      />
                    </template>
                  </el-image>
                  <div class="scene-edit-resource-card__name" :title="template.name">
                    {{ template.name }}
                  </div>
                </div>
              </el-tooltip>
            </div>
          </el-collapse-item>
        </el-collapse>
        <el-empty v-else description="暂无可用模板" :image-size="64" />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { throttle } from 'lodash-es'
import errorImage from '@/assets/images/error.png'
import { subscribeActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import type { ViewportHost } from '@/scene-platform'
import type { Dim3dTemplateSceneType } from '@/servers/manual/dim3d/api/template'
import { MITT_ON_KEY_ENUM } from '@/enums'
import {
  isTemplateVisibleInScene,
  loadDim3dTemplateGroups,
  type TemplateResourceGroup,
  type TemplateResourceItem,
} from '../templateResource'

const { $eventBus } = getCurrentInstance()?.proxy || {}

const searchValue = ref('')
const templateGroups = ref<TemplateResourceGroup[]>([])
const currentSceneType = ref<Dim3dTemplateSceneType | null>(null)
const activeNames = ref<string[]>([])

/** 从平台 Store 读取当前运行时场景类型，避免依赖路由参数导致切换场景后过滤失效。 */
const updateSceneType = (host: ViewportHost | null) => {
  currentSceneType.value = host?.getStore().getScene().type ?? null
}

const visibleGroups = computed<TemplateResourceGroup[]>(() =>
  templateGroups.value
    .map((group) => ({
      ...group,
      children: group.children.filter((item) =>
        isTemplateVisibleInScene(item, currentSceneType.value),
      ),
    }))
    .filter((group) => group.children.length > 0),
)

/**
 * 模板搜索只在完成场景兼容过滤的结果上运行。
 * 这里保留通用资源面板的交互：命中分类时显示该分类全部模板，命中模板名时只显示命中项；
 * 使用明确的模板类型实现，避免通用过滤器的宽泛索引签名让领域字段退化为未知类型。
 */
const collapseList = computed<TemplateResourceGroup[]>(() => {
  const keyword = searchValue.value.trim().toLowerCase()
  if (!keyword) return visibleGroups.value

  return visibleGroups.value
    .filter((group) => {
      if (group.name.toLowerCase().includes(keyword)) return true
      return group.children.some((item) => item.name.toLowerCase().includes(keyword))
    })
    .map((group) => {
      if (group.name.toLowerCase().includes(keyword)) return group
      return {
        ...group,
        children: group.children.filter((item) => item.name.toLowerCase().includes(keyword)),
      }
    })
})

/** 搜索或场景类型变化后自动展开当前可见分类，避免筛选结果被隐藏在折叠面板中。 */
const syncActiveNames = () => {
  activeNames.value = collapseList.value.map((group) => group.key)
}

const handleSearch = throttle(syncActiveNames, 300)

/** 模板拖拽只传递轻量列表元数据，真实四包必须等用户在画布确认后再请求。 */
const onDragStart = (template: TemplateResourceItem) => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_START, template)
}

const onDragEnd = () => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_CANCEL)
}

const loadTemplates = async () => {
  try {
    // 模板入口只存在于“系统资源”属于界面规则；分页接口需与模板管理保持一致，不发送旧资源归属筛选。
    templateGroups.value = await loadDim3dTemplateGroups()
  } catch {
    templateGroups.value = []
  }
  syncActiveNames()
}

let stopScenePlatformHostSubscription: (() => void) | undefined

onMounted(() => {
  stopScenePlatformHostSubscription = subscribeActiveSceneViewportHost(updateSceneType)
  void loadTemplates()
})

watch(visibleGroups, syncActiveNames)

onBeforeUnmount(() => {
  stopScenePlatformHostSubscription?.()
  stopScenePlatformHostSubscription = undefined
  handleSearch.cancel()
})
</script>
