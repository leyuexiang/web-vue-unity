<script setup lang="ts">
import { computed, watch } from 'vue'
import { SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'
import { resolveWidgetPanelSelection } from '@/integrations/scene/widgetPanels'
import WidgetBasePanel from './components/WidgetPanels/WidgetBasePanel/index.vue'
import WidgetDataPanel from './components/WidgetPanels/WidgetDataPanel/index.vue'
import WidgetAnimationPanel from './components/WidgetPanels/WidgetAnimationPanel/index.vue'
import WidgetEventPanel from './components/WidgetPanels/WidgetEventPanel/index.vue'
import StageSizePanel from './components/ScenePanel/StageSizePanel.vue'
import SceneMediaServerPanel from './components/ScenePanel/SceneMediaServerPanel.vue'
/** 沿用来源选择路由和各专用面板，二维配置不依赖三维对象或旧渲染器。 */
const inspectorPanel = defineModel<SCENE_PANEL_ENUM>('inspectorPanel', { default: SCENE_PANEL_ENUM.Base })
const selection = computed(() => resolveWidgetPanelSelection())
const isWidget = computed(() => ['widget', 'widgetChild', 'widgetGroup'].includes(selection.value.kind))
watch(() => selection.value.kind, () => { inspectorPanel.value = SCENE_PANEL_ENUM.Base })
</script>
<template>
  <div class="scene-edit-right-shell" data-scene-right-panel="true">
    <div class="scene-edit-right-panel scene-edit-panel-surface h-full" data-scene-right-panel="true">
      <el-scrollbar v-if="!isWidget" class="scene-edit-scene-inspector">
        <div v-if="inspectorPanel === SCENE_PANEL_ENUM.Base" class="scene-edit-scene-panel p-3 text-[14px]">
          <StageSizePanel /><SceneMediaServerPanel />
        </div>
        <el-empty v-else description="三维运行能力将在二维验收后接入" />
      </el-scrollbar>
      <div v-else class="scene-edit-inspector-shell">
        <el-scrollbar class="scene-edit-property-inspector">
          <div class="scene-edit-property-inspector__content">
            <WidgetDataPanel v-if="inspectorPanel === SCENE_PANEL_ENUM.Data" />
            <WidgetAnimationPanel v-else-if="inspectorPanel === SCENE_PANEL_ENUM.Animation" />
            <WidgetEventPanel v-else-if="inspectorPanel === SCENE_PANEL_ENUM.Interaction || inspectorPanel === SCENE_PANEL_ENUM.Status" :panel-type="inspectorPanel" />
            <WidgetBasePanel v-else />
          </div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scene-edit-right-shell {
  /**
   * 右侧检查器默认 320px，并由外层分栏约束在 300–400px 内拖动；它不是悬浮玻璃卡片。
   * 去除外层留白与阴影后，分割线会与顶部“基础 / 相机”等标签页连续，
   * 同时不影响内部各类对象属性面板的挂载和滚动逻辑。
   */
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0;

  /**
   * 共享属性控件的窄宽度适配必须依据右侧面板自身宽度，而不是浏览器窗口宽度。
   * 将右栏声明为命名内联尺寸容器后，即使页面保持 1920px，右栏拖到 300px 时，
   * 映射列表、状态列表、缩略图和步进器仍会正确进入紧凑布局。
   */
  container-name: scene-right-panel;
  container-type: inline-size;
  background: #1d2b36;
  border-left: 1px solid var(--scene-edit-line);
}
.scene-edit-right-panel {
  box-sizing: border-box;
  min-width: 0;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #1d2b36;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;

  /**
   * 属性面板会继承 sceneEdit 全局主题的表单变量；这里将变量收敛到 Figma 属性控件令牌，
   * 让全局路由态覆盖规则也解析为同一套深色底、14% 描边和青绿色交互色，避免出现
   * “共享样式已加载但最终计算样式仍回退到旧蓝色主题”的层叠冲突。
   */
  --scene-edit-bg-input: #131c26;
  --scene-edit-line: rgb(255 255 255 / 14%);
  --scene-edit-line-strong: rgb(90 178 165 / 48%);
  --scene-edit-accent: #5ab2a5;
}
.scene-edit-scene-inspector {
  /**
   * Figma 节点 1:3406：场景配置从 y=96 开始，面板内侧为 12px，实际内容宽度为 292px。
   * 变量只在场景级属性区生效，使输入控件使用设计稿的 #131C26 与 14% 白色描边，
   * 不扩散到对象、图表和组件的既有检查器表单。
   */
  height: 100%;

  --scene-edit-bg-input: #131c26;
  --scene-edit-line: rgb(255 255 255 / 14%);

  /**
   * 默认 320px 时内容区左 12px、右 16px，正好落在设计节点的 292px 有效宽度；
   * 拉宽后中间内容区自动获得剩余空间，滚动条仍覆盖在右侧且不挤压共享控件。
   * 滚动条为覆盖式 4px 轨道，不再让浏览器原生滚动条挤压表单与滑块。
   */
  :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
  }
  :deep(.el-scrollbar__view) {
    box-sizing: border-box;
    min-height: 100%;
    padding: 12px 16px 12px 12px;
  }
  :deep(.el-scrollbar__bar.is-vertical) {
    top: 12px;
    right: 6px;
    bottom: 12px;
    width: 4px;
  }
  :deep(.el-scrollbar__thumb) {
    background: rgb(255 255 255 / 24%);
    border-radius: 2px;
  }
  :deep(.el-scrollbar__thumb:hover) {
    background: rgb(255 255 255 / 36%);
  }
}
.scene-edit-inspector-shell {
  /**
   * 非场景属性面板的内容坐标从第二行标签结束处开始。
   * 这里不再添加标题或卡片留白，保证模型和二维组件均与 Figma 的 320px 侧栏使用同一基线。
   */
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.scene-edit-property-inspector {
  flex: 1 1 auto;
  min-height: 0;

  /** 覆盖式窄滚动条不占用 292px 的属性控件有效宽度。 */
  :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
  }
  :deep(.el-scrollbar__view) {
    min-height: 100%;
  }
  :deep(.el-scrollbar__bar.is-vertical) {
    top: 12px;
    right: 5px;
    bottom: 12px;
    width: 4px;
  }
  :deep(.el-scrollbar__thumb) {
    background: rgb(255 255 255 / 24%);
    border-radius: 2px;
  }
  :deep(.el-scrollbar__thumb:hover) {
    background: rgb(255 255 255 / 36%);
  }
}
.scene-edit-property-lock-guard[aria-disabled='true'] {
  /** 锁定态保持内容可读，只降低交互控件强调度；真正的写入仍由适配器和命令双重守卫。 */
  opacity: 0.72;
}
</style>

<!-- 共享属性控件必须使用非 scoped 样式，才能覆盖 Element Plus 子组件内部节点。 -->
<style lang="scss">
@use './components/PropertyControls/propertyControls';
</style>
