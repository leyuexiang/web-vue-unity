<template>
  <!--
    属性映射列表是一个完整共享组件：表头、可变数量的映射行、删除动作和新增入口均在内部渲染。
    调用方只通过作用域插槽提供业务控件，不再手工拼装行组件，从而保证三种 Figma 变体始终同构。
  -->
  <section
    class="scene-edit-property-mapping-list"
    :class="[
      `scene-edit-property-mapping-list--${variant}`,
      { 'has-actions': showActions },
      attrs.class,
    ]"
    :style="rootStyle"
  >
    <button
      class="scene-edit-property-mapping-list__section-header"
      type="button"
      :aria-expanded="expanded"
      :disabled="!collapsible"
      @click="toggleExpanded"
    >
      <span>{{ title }}</span>
      <span
        v-if="collapsible"
        class="scene-edit-collapse-icon"
        :class="{ 'is-expanded': expanded }"
        aria-hidden="true"
      />
    </button>

    <div v-show="expanded" class="scene-edit-property-mapping-list__content">
      <div class="scene-edit-property-mapping-list__head" aria-hidden="true">
        <span>{{ labelHeader }}</span>
        <span>{{ controlHeader }}</span>
        <span>{{ statusHeader }}</span>
        <span v-if="showActions">{{ actionHeader }}</span>
      </div>

      <div class="scene-edit-property-mapping-list__body">
        <div
          v-for="(item, index) in items"
          :key="item.key"
          class="scene-edit-property-mapping-list__row"
        >
          <div class="scene-edit-property-mapping-list__label" :title="item.label">
            <slot name="label" :item="item" :index="index">{{ item.label }}</slot>
          </div>
          <div class="scene-edit-property-mapping-list__control">
            <slot name="control" :item="item" :index="index" />
          </div>
          <div class="scene-edit-property-mapping-list__status">
            <!--
              状态列使用只读字段外观承载业务结果，视觉上与 Figma 的紧凑下拉框等高，
              但不伪造可点击行为；状态内容仍由调用方提供，组件只负责统一尺寸和截断。
            -->
            <div class="scene-edit-property-mapping-list__status-display" aria-readonly="true">
              <slot name="status" :item="item" :index="index" />
            </div>
          </div>
          <div v-if="showActions" class="scene-edit-property-mapping-list__action">
            <slot name="action" :item="item" :index="index">
              <ScenePropertyButton
                v-if="item.removable"
                text
                class="scene-edit-property-mapping-list__remove"
                native-type="button"
                :icon="Delete"
                :aria-label="`删除${item.label}`"
                @click="emit('remove', item, index)"
              />
            </slot>
          </div>
        </div>
      </div>

      <ScenePropertyButton
        v-if="showAddButton"
        text
        class="scene-edit-property-mapping-list__add"
        native-type="button"
        :icon="Plus"
        @click="emit('add')"
      >
        {{ addLabel }}
      </ScenePropertyButton>

      <!-- 与映射列表语义绑定的提示放在展开内容内，折叠时同步隐藏，避免业务面板在外部拼接残留内容。 -->
      <slot name="after" />
    </div>
  </section>
</template>

<script lang="ts">
/** 共享映射列表的三种 Figma 结构变体。 */
export type ScenePropertyMappingListVariant = 'editable-addable' | 'fixed' | 'editable'

export interface ScenePropertyMappingListItem {
  /** 行渲染键优先使用稳定业务字段；旧索引数组可组合索引生成当前映射周期内的唯一键。 */
  key: string | number
  /** 左侧可见属性名。 */
  label: string
  /** 当前行是否显示删除按钮；固定行可与可删除行共存。 */
  removable?: boolean
  /** 左侧目标字段是否允许编辑；仅人工新增的映射项应开启。 */
  targetEditable?: boolean
  /** 左侧目标字段是否使用可选可填下拉；所有人工映射行通过该标记复用共享列表结构。 */
  targetSelectable?: boolean
  /** 当前映射的源字段，供调用方的作用域插槽直接绑定。 */
  sourceField?: string
  /** 目标路径用于普通属性映射，图表维度行可不提供。 */
  targetPath?: string
  /** 图表数值行索引；只有图表映射需要。 */
  measureIndex?: number
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, type StyleValue } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'

defineOptions({
  /** 列表根节点自行接管 class/style，避免布局属性错误落到内部按钮。 */
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 行数量完全由业务数组决定，支持零项及运行时增删。 */
    items?: ScenePropertyMappingListItem[]
    title?: string
    collapsible?: boolean
    defaultExpanded?: boolean
    /** 三种 Figma 变体只控制操作列和新增入口，不改变行数据结构。 */
    variant?: ScenePropertyMappingListVariant
    labelHeader?: string
    controlHeader?: string
    statusHeader?: string
    actionHeader?: string
    addLabel?: string
  }>(),
  {
    items: () => [],
    title: '属性映射',
    collapsible: true,
    defaultExpanded: true,
    variant: 'fixed',
    labelHeader: '属性',
    controlHeader: '映射',
    statusHeader: '状态',
    actionHeader: '操作',
    addLabel: '添加映射项',
  },
)

const emit = defineEmits<{
  /** 删除事件携带稳定业务项和当前索引，调用方无需再次遍历查找。 */
  (event: 'remove', item: ScenePropertyMappingListItem, index: number): void
  /** 新增只表达用户意图，具体默认字段由业务面板决定。 */
  (event: 'add'): void
}>()

const attrs = useAttrs()
const rootStyle = computed<StyleValue | undefined>(() => attrs.style as StyleValue | undefined)
const showActions = computed(() => props.variant !== 'fixed')
const showAddButton = computed(() => props.variant === 'editable-addable')
const expanded = ref(props.defaultExpanded)

/** 折叠只隐藏列表 DOM，不改动映射数组和下拉值，重新展开时保持用户当前编辑状态。 */
const toggleExpanded = () => {
  if (!props.collapsible) return
  expanded.value = !expanded.value
}
</script>
