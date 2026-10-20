<template>
  <!--
    二维组件与二维分组都以同一条“对齐方式”属性行承载六个对齐动作。
    组件不保存位置状态，只执行父级传入的既有动作，因此不会改变撤销、舞台坐标或分组位移逻辑。
  -->
  <ScenePropertyRow label="对齐方式" class="scene-edit-widget-align-row">
    <div class="scene-edit-widget-align-control">
      <!--
        Figma 节点 1:2277 下的 2160:20133、2160:20149 将水平和垂直动作拆成两个等宽组三按钮；
        两组仅负责视觉归类，不改变父级传入的动作顺序和位置计算。
      -->
      <div
        v-for="group in actionGroups"
        :key="group.key"
        class="scene-edit-widget-align-control__group"
      >
        <button
          v-for="action in group.actions"
          :key="action.key"
          type="button"
          class="scene-edit-widget-align-control__button"
          :title="action.label"
          :aria-label="action.label"
          :disabled="disabled"
          @click="action.run"
        >
          <!-- 六个动作共享节点 1:2277 的最新 18px 线框图标和颜色状态。 -->
          <span class="scene-edit-widget-align-control__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" focusable="false">
              <!--
                Figma 节点 1:2277 的最新图标由“对象外框”和“对齐基准线”两条描边路径组成。
                路径保持独立可避免旧版复合实心图标再次出现，同时通过 currentColor 复用交互颜色。
              -->
              <path
                v-for="(path, pathIndex) in alignIconPaths[action.key]"
                :key="pathIndex"
                :d="path"
              />
            </svg>
          </span>
        </button>
      </div>
    </div>
  </ScenePropertyRow>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScenePropertyRow from '../ScenePropertyRow/index.vue'

defineOptions({ name: 'SceneWidgetAlignControl' })

type WidgetAlignAction = {
  /** 语义化动作键，同时决定对应的 CSS 对齐图标。 */
  key: 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom'
  /** 供鼠标悬停与辅助技术读取的中文动作名称。 */
  label: string
  /** 位置计算仍由组件或分组父级持有，避免共享控件耦合业务状态。 */
  run: () => void
}

/**
 * 六个最新 Figma 线框图标按业务动作键建立常量索引。
 * 路径来自右侧属性面板组件节点 1:2277 下的 2160:20136、2160:20141、2160:20146、
 * 2160:20152、2160:20157、2160:20162。每个图标仅含两条静态路径，模块初始化后直接复用，
 * 不依赖会过期的 Figma 临时资源地址，也不会在组件更新时重复解析或创建路径数据。
 */
const alignIconPaths: Record<WidgetAlignAction['key'], readonly [string, string]> = {
  left: ['M15.9375 6.375H5.4375V11.625H15.9375V6.375Z', 'M2.4375 2.25V15.75'],
  'h-center': ['M11.625 2.625H6.375V15.375H11.625V2.625Z', 'M15.75 9H2.25'],
  right: ['M12.75 6.375H2.25V11.625H12.75V6.375Z', 'M15.75 2.25V15.75'],
  top: ['M11.625 5.4375H6.375V15.9375H11.625V5.4375Z', 'M15.75 2.4375H2.25'],
  'v-center': ['M15.375 6.375H2.625V11.625H15.375V6.375Z', 'M9 2.25V15.75'],
  bottom: ['M11.625 2.25H6.375V12.75H11.625V2.25Z', 'M15.75 15.75H2.25'],
}

const props = withDefaults(
  defineProps<{
    /** 六个已绑定既有业务逻辑的对齐动作。 */
    actions: readonly WidgetAlignAction[]
    /** 锁定或空分组时禁用动作，防止共享按钮绕过业务写入守卫。 */
    disabled?: boolean
  }>(),
  { disabled: false },
)

/**
 * 设计稿固定为前三项水平对齐、后三项垂直对齐。
 * computed 只在父级动作引用变化时切分一次，避免每次模板更新都创建新的分组数组。
 */
const actionGroups = computed(() => [
  { key: 'horizontal', actions: props.actions.slice(0, 3) },
  { key: 'vertical', actions: props.actions.slice(3, 6) },
])
</script>
