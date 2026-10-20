<template>
  <div class="table-config-panel-shell">
    <ScenePropertyCollapse v-model="activeSections">
      <ScenePropertyCollapseItem name="basic" title="基础配置">
        <!-- 仅在展开时渲染长表单，折叠状态不产生额外控件更新和布局计算。 -->
        <div v-if="activeSections.includes('basic')">
          <slot />
        </div>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem name="styleJson" title="样式 JSON">
        <template v-if="activeSections.includes('styleJson')">
          <setting-item-box name="样式配置(JSON)" :alone="true">
            <setting-item>
              <TableJsonEditor v-model="styleOptionModel" />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>
    </ScenePropertyCollapse>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import SettingItem from '@/components/SettingItem/index.vue'
import SettingItemBox from '@/components/SettingItemBox/index.vue'
import ScenePropertyCollapse from '@/components/ScenePropertyCollapse/index.vue'
import ScenePropertyCollapseItem from '@/components/ScenePropertyCollapseItem/index.vue'
import TableJsonEditor from './TableJsonEditor.vue'
import { applyTableStyleOption, createTableStyleOption } from './tableStyleOption'

defineOptions({ name: 'TableConfigPanelShell' })

const props = defineProps({
  option: { type: Object as PropType<object>, required: true },
})

/** 默认只展开基础配置，与改造前的直接展示保持一致，样式 JSON 按需加载编辑器。 */
const activeSections = ref<string[]>(['basic'])

const styleOptionModel = computed({
  get: () => createTableStyleOption(props.option),
  set: (value: Record<string, unknown>) => applyTableStyleOption(props.option, value),
})
</script>

<style scoped lang="scss">
.table-config-panel-shell {
  :deep(.el-collapse-item__header) {
    /* 与图表配置面板使用相同标题规格，保持二维组件属性栏层级一致。 */
    font-size: 14px;
    font-weight: 600;
  }
  :deep(.el-collapse-item__content) {
    padding-bottom: 6px;
  }
}
</style>
