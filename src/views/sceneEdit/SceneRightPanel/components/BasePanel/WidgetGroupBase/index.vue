<template>
  <div v-if="groupState">
    <!--
      二维分组的几何信息来自成员实时包围框，不保存独立位置和尺寸。
      位置、对齐与画布拖动通过编辑器临时代理批量移动成员，不创建运行时父子节点。
    -->
    <setting-item-box name="名称" :alone="true">
      <setting-item>
        <ScenePropertyInput
          v-model="groupNameModel"
          placeholder="名称"
          :disabled="groupState.locked"
        />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="启用" :alone="true">
      <setting-item>
        <ScenePropertySwitch v-model="groupVisibleModel" />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="锁定" :alone="true">
      <setting-item>
        <ScenePropertySwitch v-model="groupLockedModel" />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="尺寸">
      <setting-item name="宽度">
        <ScenePropertyNumberInput
          :model-value="groupBounds?.w"
          placeholder="宽度"
          :controls="false"
          disabled
        />
      </setting-item>
      <setting-item name="高度">
        <ScenePropertyNumberInput
          :model-value="groupBounds?.h"
          placeholder="高度"
          :controls="false"
          disabled
        />
      </setting-item>
    </setting-item-box>

    <!-- 空组或有效锁定时保留字段布局，但禁止执行任何整体变换。 -->
    <SceneWidgetAlignControl :actions="alignActions" :disabled="transformDisabled" />

    <setting-item-box name="位置">
      <setting-item name="左">
        <ScenePropertyNumberInput
          :model-value="groupBounds?.l"
          placeholder="左"
          :step="1"
          :controls="false"
          disabled-scientific
          :disabled="transformDisabled"
          @change="handleGroupLeftChange"
        />
      </setting-item>
      <setting-item name="上">
        <ScenePropertyNumberInput
          :model-value="groupBounds?.t"
          placeholder="上"
          :step="1"
          :controls="false"
          disabled-scientific
          :disabled="transformDisabled"
          @change="handleGroupTopChange"
        />
      </setting-item>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getWidgetPanelCanvasConfig,
  getWidgetPanelGroupBounds,
  getWidgetPanelGroupIds,
  getWidgetPanelGroupState,
  getWidgetPanelGroupVisible,
  isWidgetPanelGroupTransformLocked,
  moveWidgetPanelGroup,
  runWidgetPanelHistoryChange,
  setWidgetPanelGroupLocked,
  setWidgetPanelGroupVisible,
  updateWidgetPanelGroupName,
} from '@/integrations/scene/widgetPanels'
import ScenePropertyInput from '../../PropertyControls/ScenePropertyInput/index.vue'
import ScenePropertyNumberInput from '../../PropertyControls/ScenePropertyNumberInput/index.vue'
import ScenePropertySwitch from '../../PropertyControls/ScenePropertySwitch/index.vue'
import SceneWidgetAlignControl from '../../PropertyControls/SceneWidgetAlignControl/index.vue'

defineOptions({ name: 'WidgetGroupBase' })

const props = defineProps({
  groupId: { type: String, required: true },
})

/**
 * 名称、显隐和锁定由各自的 Store 接口记录历史；这里只给几何变换包一条历史，
 * 防止同一次操作生成嵌套命令，确保撤销一次即可恢复整组成员位置。
 */
const recordGroupTransform = (name: string, mutate: () => void) => {
  const widgetIds = getWidgetPanelGroupIds(props.groupId)
  if (!widgetIds.length || isWidgetPanelGroupTransformLocked(props.groupId)) return
  runWidgetPanelHistoryChange(name, widgetIds, mutate)
}

/** 空分组没有几何包围框，但仍保留名称、显隐和锁定配置。 */
const groupState = computed(() => getWidgetPanelGroupState(props.groupId))
const groupBounds = computed(() => getWidgetPanelGroupBounds(props.groupId, true))
const transformDisabled = computed(
  () => !groupBounds.value || isWidgetPanelGroupTransformLocked(props.groupId),
)

const groupNameModel = computed({
  get: () => groupState.value?.name || '',
  set: (value: string) => {
    if (!groupState.value || groupState.value.locked) return
    updateWidgetPanelGroupName(props.groupId, value)
  },
})

/** 分组显隐只修改组级状态，不覆盖成员各自的 visible。 */
const groupVisibleModel = computed({
  get: () => getWidgetPanelGroupVisible(props.groupId),
  set: (value: boolean) => setWidgetPanelGroupVisible(props.groupId, value),
})

/** 分组锁定采用继承语义，解锁后成员恢复各自原有锁定状态。 */
const groupLockedModel = computed({
  get: () => groupState.value?.locked === true,
  set: (value: boolean) => setWidgetPanelGroupLocked(props.groupId, value),
})

const moveGroupTo = (nextLeft: number, nextTop: number) => {
  const currentBounds = groupBounds.value
  if (!currentBounds || transformDisabled.value) return
  const deltaX = nextLeft - currentBounds.l
  const deltaY = nextTop - currentBounds.t
  if (!deltaX && !deltaY) return

  recordGroupTransform('移动部件分组', () => {
    moveWidgetPanelGroup(props.groupId, deltaX, deltaY)
  })
}

/**
 * 位置输入只在 Element Plus 的 change 时提交，避免用户逐字输入时连续产生多条历史。
 * 包围框仍由成员派生，提交后下一轮响应式计算会自动回显最终位置。
 */
const handleGroupLeftChange = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value) || !groupBounds.value) return
  moveGroupTo(value, groupBounds.value.t)
}

const handleGroupTopChange = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value) || !groupBounds.value) return
  moveGroupTo(groupBounds.value.l, value)
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** 六向对齐始终以设计画布和当前成员包围框为基准，只改变成员坐标。 */
const alignLeft = () => {
  if (groupBounds.value) moveGroupTo(0, groupBounds.value.t)
}
const alignHorizontalCenter = () => {
  const bounds = groupBounds.value
  const canvas = getWidgetPanelCanvasConfig()
  if (!bounds || !canvas) return
  moveGroupTo(clamp((canvas.width - bounds.w) / 2, 0, canvas.width), bounds.t)
}
const alignRight = () => {
  const bounds = groupBounds.value
  const canvas = getWidgetPanelCanvasConfig()
  if (!bounds || !canvas) return
  moveGroupTo(Math.max(canvas.width - bounds.w, 0), bounds.t)
}
const alignTop = () => {
  if (groupBounds.value) moveGroupTo(groupBounds.value.l, 0)
}
const alignVerticalCenter = () => {
  const bounds = groupBounds.value
  const canvas = getWidgetPanelCanvasConfig()
  if (!bounds || !canvas) return
  moveGroupTo(bounds.l, clamp((canvas.height - bounds.h) / 2, 0, canvas.height))
}
const alignBottom = () => {
  const bounds = groupBounds.value
  const canvas = getWidgetPanelCanvasConfig()
  if (!bounds || !canvas) return
  moveGroupTo(bounds.l, Math.max(canvas.height - bounds.h, 0))
}

const alignActions = [
  { key: 'left' as const, label: '左对齐', run: alignLeft },
  { key: 'h-center' as const, label: '水平居中', run: alignHorizontalCenter },
  { key: 'right' as const, label: '右对齐', run: alignRight },
  { key: 'top' as const, label: '顶部对齐', run: alignTop },
  { key: 'v-center' as const, label: '垂直居中', run: alignVerticalCenter },
  { key: 'bottom' as const, label: '底部对齐', run: alignBottom },
]
</script>
