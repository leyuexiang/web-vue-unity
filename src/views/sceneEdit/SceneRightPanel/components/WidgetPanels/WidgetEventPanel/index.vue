<template>
  <InteractionPanel :panel-type="panelType" target-kind="widget" />
</template>

<script setup lang="ts">
import { SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'
import InteractionPanel from '../../InteractionPanel/index.vue'

defineOptions({ name: 'WidgetEventPanel' })

withDefaults(
  defineProps<{
    /**
     * 二维状态和交互共用同一套事件表单。
     * 目标固定为 widget，读写 component.statusList / component.interactiveEvent。
     */
    panelType?: SCENE_PANEL_ENUM.Status | SCENE_PANEL_ENUM.Interaction
  }>(),
  {
    panelType: SCENE_PANEL_ENUM.Interaction,
  },
)
</script>
