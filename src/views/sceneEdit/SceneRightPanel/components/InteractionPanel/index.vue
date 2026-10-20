<template>
  <div
    class="scene-edit-interaction-panel"
    :class="{ 'scene-edit-interaction-panel--status': isStatusPanel }"
  >
    <!--
      Figma 页面节点 1:5388 的状态面板从页签下方 12px 开始，标题行固定为 20px。
      状态操作仅保留 14px 加号，不使用旧圆形加号和卡片标题，避免视觉层改变既有规则数据。
    -->
    <div class="scene-edit-interaction-panel__header">
      <p class="scene-edit-interaction-panel__title">{{ isStatusPanel ? '状态' : '事件' }}</p>
      <ScenePropertyButton
        text
        :icon="Plus"
        class="scene-edit-interaction-panel__add scene-edit-property-button--bare-icon"
        :aria-label="isStatusPanel ? '新增状态' : '新增事件'"
        @click="showAddEventDialog"
      />
    </div>

    <!--
      Figma 搜索框正式接入状态/事件属性面板。
      标签列和输入列由共享属性行控制，搜索框宽度跟随右栏变化，不使用固定像素值。
    -->
    <ScenePropertyRow
      v-if="!isStatusPanel && eventList.length"
      label="事件名称"
      control-fill
      class="scene-edit-interaction-panel__search-row"
    >
      <ScenePropertySearch v-model="searchKeyword" placeholder="搜索" />
    </ScenePropertyRow>

    <ScenePropertyStateList
      v-if="filteredEventList.length"
      :variant="isStatusPanel ? 'flat' : 'card'"
    >
      <ScenePropertyStateRow
        v-for="item in filteredEventList"
        :key="item.id"
        :show-status="!isStatusPanel"
        class="scene-edit-interaction-panel__row"
      >
        <template #status>
          <span
            class="scene-edit-property-state-list__status-dot"
            :class="{ 'is-active': item.isOpen }"
            :aria-label="item.isOpen ? '已启用' : '未启用'"
            role="status"
          />
        </template>
        <template #label>
          <span class="scene-edit-interaction-panel__label">
            {{ isStatusPanel ? item.statusName : item.eventName }}
          </span>
        </template>
        <template #actions>
          <ScenePropertyButton
            text
            size="small"
            class="scene-edit-property-button--bare-icon"
            aria-label="编辑"
            @click="handleEditEvent(item)"
          >
            <span class="scene-edit-interaction-panel__figma-icon is-edit" aria-hidden="true" />
          </ScenePropertyButton>
          <ScenePropertyButton
            text
            size="small"
            class="scene-edit-property-button--bare-icon"
            aria-label="删除"
            @click="handleDeleteEvent(item.id)"
          >
            <span class="scene-edit-interaction-panel__figma-icon is-delete" aria-hidden="true" />
          </ScenePropertyButton>
        </template>
      </ScenePropertyStateRow>
    </ScenePropertyStateList>
    <div v-else-if="!isStatusPanel">
      <el-empty :description="eventList.length ? '暂无匹配结果' : '暂无数据'" />
    </div>

    <AddEditEventDrawer
      ref="addEditEventDrawerRef"
      :panel-type="panelType"
      :target-kind="targetKind"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { InteractionEvent } from '@/types/threeScene'
import { useSceneStore } from '@/stores/sceneEditStore'
import type { SceneStore } from '@/scene-platform'
import {
  getInteractiveEventConfig,
  getStatusListConfig,
  updateInteractiveEventConfig,
  updateStatusListConfig,
} from '@/utils/renderScene/sceneModules'
import { SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
import ScenePropertySearch from '@/components/ScenePropertySearch/index.vue'
import ScenePropertyStateList from '@/components/ScenePropertyStateList/index.vue'
import ScenePropertyStateRow from '@/components/ScenePropertyStateRow/index.vue'
import AddEditEventDrawer from './AddEditEventDrawer/index.vue'
import {
  getWidgetInteractiveEventList,
  getWidgetStatusList,
  resolveWidgetPanelSelection,
  setWidgetInteractiveEventList,
  setWidgetStatusList,
} from '@/integrations/scene/widgetPanels'
import {
  getActiveSceneViewportHost,
  subscribeActiveSceneViewportHost,
} from '@/integrations/scene/editorScenePlatformHost'
import { resolveEditorSceneObjectIdFromLegacyEngineId } from '@/integrations/scene/editorSceneRuntimeObjectIdResolver'
import {
  getEditorSceneObjectInteractiveEventList,
  getEditorSceneObjectStatusList,
  hasEditorSceneObjectInteractiveEventMetadata,
  hasEditorSceneObjectStatusListMetadata,
  setEditorSceneObjectInteractiveEventList,
  setEditorSceneObjectStatusList,
} from '@/integrations/scene/editorSceneInteractionConfigAdapter'

type InteractionPanelTargetKind = 'auto' | 'widget' | 'sceneObject'

interface Props {
  panelType?: SCENE_PANEL_ENUM.Status | SCENE_PANEL_ENUM.Interaction
  /**
   * 状态/交互面板目标来源。
   * widget 只读写二维部件配置，sceneObject 只读写三维对象配置，auto 保留旧兼容策略。
   */
  targetKind?: InteractionPanelTargetKind
}

const props = withDefaults(defineProps<Props>(), {
  panelType: SCENE_PANEL_ENUM.Interaction,
  targetKind: 'auto',
})

/** 状态页使用 Figma 的平面状态列表；事件页继续保留搜索和状态点语义。 */
const isStatusPanel = computed(() => props.panelType === SCENE_PANEL_ENUM.Status)

const store = useSceneStore()
const scenePlatformStore = ref<SceneStore | null>(null)
const scenePlatformStoreRevision = ref(0)
let stopScenePlatformHostSubscription: (() => void) | null = null
let stopScenePlatformStoreSubscription: (() => void) | null = null

const refreshScenePlatformStoreRevision = () => {
  scenePlatformStoreRevision.value += 1
}

/**
 * 订阅当前活动视口提供的 SceneStore。
 *
 * 三维对象状态/交互从 F016 起优先读写 SceneObject.metadata；Store 变化只提升本地版本号，
 * 由 computed 统一重读配置，避免在订阅回调里直接修改面板列表造成重复状态源。
 */
const subscribeScenePlatformStore = (nextStore: SceneStore | null) => {
  stopScenePlatformStoreSubscription?.()
  stopScenePlatformStoreSubscription = null
  scenePlatformStore.value = nextStore
  refreshScenePlatformStoreRevision()

  if (!nextStore) return

  stopScenePlatformStoreSubscription = nextStore.subscribe(refreshScenePlatformStoreRevision)
}

/**
 * 列表数据根据目标类型显式分流。
 * 三维对象优先读 SceneObject.metadata，旧 userData 只作为当前过渡期兜底；
 * 二维部件继续读 widgetPanels 适配层，避免交叉写入三维对象配置。
 */
const currentTransformMaterialUuid = computed(() => store.currentTransformMaterialUuid)
const transformMaterialRandomId = computed(() => store.transformMaterialRandomId)
const widgetPanelSelection = computed(() => resolveWidgetPanelSelection())
const currentWidgetEventTarget = computed(() => {
  const selection = widgetPanelSelection.value
  if (selection.kind === 'widget') return { widgetId: selection.id, childId: null }
  if (selection.kind === 'widgetChild') {
    return { widgetId: selection.frameId, childId: selection.childId }
  }
  return null
})
const currentWidgetId = computed(() => currentWidgetEventTarget.value?.widgetId ?? null)
const currentWidgetChildId = computed(() => currentWidgetEventTarget.value?.childId ?? null)

/** 将旧选中 uuid 转为平台对象 id；已迁移链路后续只使用该业务标识。 */
const currentSceneObjectId = computed(() => {
  void scenePlatformStoreRevision.value
  if (props.targetKind === 'widget') return null
  const selectedId = currentTransformMaterialUuid.value
  const activeStore = scenePlatformStore.value
  if (!selectedId || !activeStore) return null
  if (activeStore.getObject(selectedId)) return selectedId
  return resolveEditorSceneObjectIdFromLegacyEngineId(
    getActiveSceneViewportHost()?.getRuntime(),
    selectedId,
  )
})

const currentWidgetEventTargetId = computed(() => {
  return props.targetKind === 'sceneObject' ? null : currentWidgetId.value
})

const resolveEventTargetKind = () => {
  if (props.targetKind === 'widget') return currentWidgetEventTargetId.value ? 'widget' : 'none'
  // 无法映射到 Store 的历史对象仍保留 sceneObject 分支，由后续旧接口兜底读取。
  if (props.targetKind === 'sceneObject') {
    return currentTransformMaterialUuid.value ? 'sceneObject' : 'none'
  }
  if (currentTransformMaterialUuid.value) return 'sceneObject'
  if (currentWidgetEventTargetId.value) return 'widget'
  return 'none'
}

const eventList = computed(() => {
  const refreshToken = `${transformMaterialRandomId.value}:${scenePlatformStoreRevision.value}`
  void refreshToken

  /**
   * 状态/交互按目标模式显式分流。
   * 二维部件面板不会调用 sceneModules 的混合目标解析，避免误写三维 userData。
   */
  const targetKind = resolveEventTargetKind()
  if (targetKind === 'none') return []

  if (targetKind === 'widget') {
    const widgetId = currentWidgetEventTargetId.value
    if (!widgetId) return []
    return props.panelType === SCENE_PANEL_ENUM.Status
      ? getWidgetStatusList(widgetId)
      : getWidgetInteractiveEventList(widgetId, currentWidgetChildId.value)
  }

  if (props.panelType === SCENE_PANEL_ENUM.Status) {
    const shouldUseLegacyFallback = !hasEditorSceneObjectStatusListMetadata(
      scenePlatformStore.value,
      currentSceneObjectId.value,
    )
    const legacyStatusList = shouldUseLegacyFallback
      ? getStatusListConfig(currentTransformMaterialUuid.value)
      : []
    return getEditorSceneObjectStatusList({
      store: scenePlatformStore.value,
      objectId: currentSceneObjectId.value,
      legacyEventList: legacyStatusList,
    })
  }

  const shouldUseLegacyFallback = !hasEditorSceneObjectInteractiveEventMetadata(
    scenePlatformStore.value,
    currentSceneObjectId.value,
  )
  const legacyInteractiveEventList = shouldUseLegacyFallback
    ? getInteractiveEventConfig(currentTransformMaterialUuid.value)
    : []
  return getEditorSceneObjectInteractiveEventList({
    store: scenePlatformStore.value,
    objectId: currentSceneObjectId.value,
    legacyEventList: legacyInteractiveEventList,
  })
})

const searchKeyword = ref('')

/**
 * 搜索只对当前已解析的列表做一次线性过滤，不额外访问仓库或运行时对象。
 * 状态与事件名称分别取对应字段，空关键词直接复用原数组，避免无意义的数组分配。
 */
const filteredEventList = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase()
  if (!keyword) return eventList.value

  return eventList.value.filter((item) => {
    const label = props.panelType === SCENE_PANEL_ENUM.Status ? item.statusName : item.eventName
    return String(label ?? '')
      .toLocaleLowerCase()
      .includes(keyword)
  })
})

/** 切换对象或页签时清空旧关键词，避免新目标被上一目标的过滤条件误判为空。 */
watch(
  [currentTransformMaterialUuid, currentWidgetId, currentWidgetChildId, () => props.panelType],
  () => {
    searchKeyword.value = ''
  },
)

/**
 * 已迁移对象只写 SceneObject.metadata，RuntimeBridge 负责同步回旧 userData；
 * 仅无法解析为平台对象的存量对象继续调用旧接口，避免写错新旧两套状态。
 */
const setSceneObjectEventList = (uuid: string | null, nextList: InteractionEvent[]) => {
  const objectId = currentSceneObjectId.value
  if (objectId) {
    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      setEditorSceneObjectStatusList({
        store: scenePlatformStore.value,
        objectId,
        eventList: nextList,
      })
      return
    }
    setEditorSceneObjectInteractiveEventList({
      store: scenePlatformStore.value,
      objectId,
      eventList: nextList,
    })
    return
  }

  if (props.panelType === SCENE_PANEL_ENUM.Status) {
    updateStatusListConfig(uuid, nextList)
    setEditorSceneObjectStatusList({
      store: scenePlatformStore.value,
      objectId: uuid,
      eventList: nextList,
    })
    return
  }

  updateInteractiveEventConfig(uuid, nextList)
  setEditorSceneObjectInteractiveEventList({
    store: scenePlatformStore.value,
    objectId: uuid,
    eventList: nextList,
  })
}

// 添加事件/状态抽屉引用。
const addEditEventDrawerRef =
  useTemplateRef<InstanceType<typeof AddEditEventDrawer>>('addEditEventDrawerRef')

const showAddEventDialog = () => {
  addEditEventDrawerRef.value?.showAddDrawer()
}

const handleEditEvent = (event: InteractionEvent) => {
  addEditEventDrawerRef.value?.showEditDrawer(event)
}

/**
 * 删除后走同一套 update 方法。
 * update 方法内部会负责刷新 userData 对应的响应式令牌，
 * 所以这里不再重复手动触发一次刷新。
 */
const handleDeleteEvent = (id: string) => {
  const targetKind = resolveEventTargetKind()
  if (targetKind === 'none') return
  const nextList = eventList.value.filter((item) => item.id !== id)

  if (targetKind === 'widget') {
    const widgetId = currentWidgetEventTargetId.value
    if (!widgetId) return
    if (props.panelType === SCENE_PANEL_ENUM.Status) {
      setWidgetStatusList(widgetId, nextList)
    } else {
      setWidgetInteractiveEventList(widgetId, nextList, currentWidgetChildId.value)
    }
    return
  }

  setSceneObjectEventList(currentTransformMaterialUuid.value, nextList)
}

onMounted(() => {
  stopScenePlatformHostSubscription = subscribeActiveSceneViewportHost((host) => {
    subscribeScenePlatformStore(host?.getStore() ?? null)
  })
})

onBeforeUnmount(() => {
  stopScenePlatformHostSubscription?.()
  stopScenePlatformHostSubscription = null
  stopScenePlatformStoreSubscription?.()
  stopScenePlatformStoreSubscription = null
  scenePlatformStore.value = null
})
</script>

<style lang="scss" scoped>
:deep(.el-tabs--top.el-tabs--card > .el-tabs__header .el-tabs__item:last-child) {
  padding-right: 10px !important;
  padding-left: 10px !important;
}
:deep(.el-tabs__item) {
  width: auto !important;
  height: 40px !important;
}
:deep(.el-tabs--card > .el-tabs__header) {
  border-bottom: none !important;
}
:deep(.el-tabs__content .el-input-number.is-controls-right .el-input__wrapper) {
  padding-right: 35px;
  padding-left: 10px;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active.is-closable) {
  display: flex;
  align-items: center;
  padding-right: 10px;
  padding-left: 10px;
}
.scene-edit-interaction-panel {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  padding: 0;
  color: var(--scene-edit-text-2);
}
.scene-edit-interaction-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 20px;
  margin-bottom: 12px;
}
.scene-edit-interaction-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}
.scene-edit-interaction-panel__add {
  width: 14px;
  min-width: 14px;
  height: 14px;
  min-height: 14px;
  padding: 0;
  color: rgb(255 255 255 / 80%);
}
.scene-edit-interaction-panel__add :deep(.el-icon) {
  width: 14px;
  height: 14px;
  font-size: 14px;
}
.scene-edit-interaction-panel__add:hover,
.scene-edit-interaction-panel__add:focus-visible,
.scene-edit-interaction-panel__add:active {
  color: #5ab2a5;
}
.scene-edit-interaction-panel__figma-icon {
  display: block;
  width: 14px;
  height: 14px;
  background-color: currentcolor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: 14px 14px;
}
.scene-edit-interaction-panel__figma-icon.is-edit {
  mask-image: url('@/assets/icons/scene-status-edit.svg');
}
.scene-edit-interaction-panel__figma-icon.is-delete {
  mask-image: url('@/assets/icons/scene-status-delete.svg');
}
.scene-edit-interaction-panel__search-row {
  width: 100%;
  min-width: 0;
  margin-bottom: 12px;
}
</style>
