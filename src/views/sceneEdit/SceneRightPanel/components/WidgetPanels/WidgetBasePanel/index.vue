<template>
  <!--
    滚动行为由 SceneRightPanel 的唯一属性滚动容器负责。
    二维组件基础面板只提供内容根节点，避免与外层重复计算视口高度、产生双滚动条或重复 12px 留白。
  -->
  <div v-if="widgetComponent" class="scene-edit-property-content">
    <!-- Figma 对二维组件的首个分组统一命名为“通用”，用于承载名称、启用、尺寸、对齐与位置。 -->
    <section v-if="!widgetChildId" class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">通用</div>
      <div class="scene-edit-property-section__body">
        <WidgetBase
          v-if="widgetComponent.attr"
          :data="widgetComponent.attr"
          :label="
            ((widgetComponent.option as Record<string, unknown> | undefined)?.label as string) ?? ''
          "
          :visible="widgetVisible"
          :interactive="(widgetComponent.option as Record<string, unknown>).interactive !== false"
          :locked="widgetLockState.effectiveLocked"
          :inherited-locked="widgetLockState.inheritedLocked"
          @update:label="updateWidgetLabel"
          @update:visible="updateWidgetVisible"
          @update:interactive="updateWidgetInteractive"
          @update:locked="updateWidgetLocked"
          @attr-change="recordWidgetConfigChange"
        />
      </div>
    </section>
    <div
      :inert="widgetLockState.effectiveLocked || undefined"
      :aria-disabled="widgetLockState.effectiveLocked"
    >
      <component
        :is="widgetConfigPanelComponent"
        v-if="widgetConfigPanelComponent"
        :key="widgetConfigPanelKey"
        :option="widgetComponent.option"
        :selected-child-id="widgetChildId || ''"
        @update:option="updateWidgetOption"
        @select-child="selectWidgetChild"
      />
    </div>
  </div>

  <!-- 分组也复用同一内容根节点，保证切换单个组件、分组时视觉坐标不跳变。 -->
  <div v-else-if="widgetGroupId" class="scene-edit-property-content">
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">通用</div>
      <div class="scene-edit-property-section__body">
        <WidgetGroupBase :group-id="widgetGroupId" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import WidgetBase from '../../BasePanel/WidgetBase/index.vue'
import WidgetGroupBase from '../../BasePanel/WidgetGroupBase/index.vue'
import { COMPONENT_TYPE, getComponentName } from '@/utils/components'
import type { WidgetHistorySnapshot } from '@/integrations/scene/widgetRuntime/widgetCommand'
import {
  bumpWidgetPanelRenderVersion,
  createWidgetPanelHistorySnapshot,
  getWidgetPanelLockState,
  recordWidgetPanelHistorySnapshot,
  resolveWidgetPanelSelection,
  setWidgetPanelLocked,
  setWidgetPanelChildSelection,
  setWidgetPanelVisible,
} from '@/integrations/scene/widgetPanels'

defineOptions({ name: 'WidgetBasePanel' })

const widgetComponent = ref<WidgetConfig['component'] | null>(null)
const widgetId = ref<string | null>(null)
const widgetGroupId = ref<string | null>(null)
const widgetChildId = ref<string | null>(null)
const oldWidgetSnapshot = ref<WidgetHistorySnapshot | null>(null)
let pendingWidgetRenderFrame = 0

/**
 * 二维基础面板只读取二维适配层暴露的部件目标。
 * 这里不访问 sceneApi、renderScene 或 sceneModules，避免和三维对象基础面板继续耦合。
 */
const syncWidgetTarget = () => {
  const selection = resolveWidgetPanelSelection()
  widgetGroupId.value = selection.kind === 'widgetGroup' ? selection.id : null

  if (selection.kind !== 'widget' && selection.kind !== 'widgetChild') {
    widgetId.value = null
    widgetChildId.value = null
    widgetComponent.value = null
    oldWidgetSnapshot.value = null
    return
  }

  widgetId.value = selection.kind === 'widget' ? selection.id : selection.frameId
  widgetChildId.value = selection.kind === 'widgetChild' ? selection.childId : null
  widgetComponent.value = selection.widget.component
  resetWidgetHistorySnapshot()

  /**
   * 旧场景或热更新前已创建的页面菜单可能仍命中旧画布缓存。
   * 第一次选中时只刷新该菜单实例，确保默认菜单树立即在画布上重新挂载，
   * 不影响同场景的图表、模型或其他二维部件。
   */
  if (widgetComponent.value.info.keyName === 'VPageMenu') {
    scheduleWidgetRenderRefresh()
  }
}

const widgetVisible = computed(() => {
  if (!widgetComponent.value) return true
  const option = widgetComponent.value.option as Record<string, unknown> | undefined
  return option?.visible !== false
})

const widgetLockState = computed(() =>
  widgetId.value
    ? getWidgetPanelLockState(widgetId.value)
    : { ownLocked: false, inheritedLocked: false, effectiveLocked: false },
)

const widgetConfigPanelComponent = computed(() => {
  if (!widgetComponent.value) return null
  return getComponentName(
    COMPONENT_TYPE.CONFIG_PANEL,
    widgetComponent.value.info.packageName,
    widgetComponent.value.info.keyName,
  )
})

const widgetConfigPanelKey = computed(
  () => `${widgetId.value || 'widget-config-empty'}:${widgetChildId.value || 'frame'}`,
)

const scheduleWidgetRenderRefresh = () => {
  const targetId = widgetId.value
  if (!targetId) return

  if (pendingWidgetRenderFrame) {
    cancelAnimationFrame(pendingWidgetRenderFrame)
  }

  pendingWidgetRenderFrame = requestAnimationFrame(() => {
    bumpWidgetPanelRenderVersion(targetId)
    pendingWidgetRenderFrame = 0
  })
}

const createCurrentWidgetSnapshot = () => {
  const selection = resolveWidgetPanelSelection()
  const targetId =
    selection.kind === 'widget'
      ? selection.id
      : selection.kind === 'widgetChild'
        ? selection.frameId
        : null
  return targetId ? createWidgetPanelHistorySnapshot([targetId]) : null
}

const selectWidgetChild = (childId: string) => {
  if (!widgetId.value) return
  setWidgetPanelChildSelection(widgetId.value, childId)
}

const resetWidgetHistorySnapshot = () => {
  oldWidgetSnapshot.value = createCurrentWidgetSnapshot()
}

/**
 * 基础面板修改属于二维部件持久化配置。
 * 这里按当前单选部件截取快照，既保证撤销/重做可恢复，又避免大场景里把所有部件塞进历史记录。
 */
const recordWidgetConfigChange = debounce(() => {
  const nextSnapshot = createCurrentWidgetSnapshot()
  if (!nextSnapshot) return

  if (!oldWidgetSnapshot.value) {
    oldWidgetSnapshot.value = nextSnapshot
    return
  }

  recordWidgetPanelHistorySnapshot('更新部件基础属性', oldWidgetSnapshot.value, nextSnapshot)
  oldWidgetSnapshot.value = nextSnapshot
}, 300)

const shouldRefreshWidgetRender = () => {
  if (!widgetComponent.value) return false
  return (
    widgetComponent.value.info.packageName === 'Chart' ||
    widgetComponent.value.info.packageName === 'Control' ||
    /**
     * 页面菜单在资源面板归入“部件 -> 控件”，运行时仍属于 Widget 包。
     * 它的菜单树直接编辑 option.menus，必须失效当前画布缓存，
     * 否则右侧配置已变而画布仍可能保持拖入时的旧快照。
     */
    widgetComponent.value.info.keyName === 'VPageMenu' ||
    // 页面分页器的页签列表通过右侧面板原地编辑，需要失效当前部件的画布配置缓存。
    widgetComponent.value.info.keyName === 'VPagePagination'
  )
}

const updateWidgetOption = (value: unknown) => {
  if (!widgetComponent.value || widgetLockState.value.effectiveLocked) return
  widgetComponent.value.option = value as Record<string, unknown>
  if (shouldRefreshWidgetRender()) {
    scheduleWidgetRenderRefresh()
  }
  recordWidgetConfigChange()
}

/** 公共交互开关保存在 option，沿用组件保存、复制、发布和撤销快照协议。 */
const updateWidgetInteractive = (value: boolean) => {
  if (!widgetComponent.value || widgetLockState.value.effectiveLocked) return
  widgetComponent.value.option = { ...widgetComponent.value.option, interactive: value }
  scheduleWidgetRenderRefresh()
  recordWidgetConfigChange()
}

const updateWidgetLabel = (value: string) => {
  if (!widgetComponent.value || widgetLockState.value.effectiveLocked) return
  widgetComponent.value.option = {
    ...(widgetComponent.value.option || {}),
    label: value,
  }
  if (shouldRefreshWidgetRender()) {
    scheduleWidgetRenderRefresh()
  }
  recordWidgetConfigChange()
}

/**
 * 部件显隐统一落到 option.visible。
 * 结构树、基础面板、状态动作和交互动作都会消费同一份二维部件持久化状态；
 * 仓库同时递增当前部件的渲染版本，使组件、装饰、图标和图表都能立即失效画布缓存。
 */
const updateWidgetVisible = (value: boolean) => {
  if (!widgetId.value || !setWidgetPanelVisible(widgetId.value, value)) return
  recordWidgetConfigChange()
}

const updateWidgetLocked = (value: boolean) => {
  if (!widgetId.value || widgetLockState.value.inheritedLocked) return
  setWidgetPanelLocked(widgetId.value, value)
}

watch(
  () => resolveWidgetPanelSelection(),
  () => {
    recordWidgetConfigChange.flush()
    syncWidgetTarget()
  },
  { immediate: true },
)

/**
 * 页面菜单和图文分页器直接编辑嵌套 option，不会像常规表单一样发出完整的 update:option。
 *
 * 因此仅监听这两个组件：每次修改节点、按钮图片、文字或布局后，
 * 只递增当前部件的渲染版本并合并一条撤销快照。不能把这个深度监听扩大到所有二维部件，
 * 否则文本输入、倒计时等高频配置也会无谓地重挂载画布组件。
 */
watch(
  () => widgetComponent.value?.option,
  () => {
    if (
      widgetComponent.value?.info.keyName !== 'VPageMenu' &&
      widgetComponent.value?.info.keyName !== 'VPagePagination'
    ) {
      return
    }
    scheduleWidgetRenderRefresh()
    recordWidgetConfigChange()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  recordWidgetConfigChange.flush()
  if (pendingWidgetRenderFrame) {
    cancelAnimationFrame(pendingWidgetRenderFrame)
  }
  recordWidgetConfigChange.cancel()
})
</script>
