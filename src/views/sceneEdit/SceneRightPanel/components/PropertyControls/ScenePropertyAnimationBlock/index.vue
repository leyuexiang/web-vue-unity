<template>
  <!--
    Figma“动画板块”的纯展示与交互层。
    组件不读取场景或二维部件仓库，只通过模型值和事件工作，因此模型、二维组件可共用同一布局。
  -->
  <section class="scene-edit-property-animation-block">
    <h3 class="scene-edit-property-animation-block__title">{{ title }}</h3>

    <div class="scene-edit-property-animation-block__summary">
      <span class="scene-edit-property-animation-block__summary-label">当前动画</span>
      <span class="scene-edit-property-animation-block__summary-value">{{
        currentAnimationLabel
      }}</span>
      <ScenePropertyButton
        v-if="clearable && model"
        text
        size="small"
        class="scene-edit-property-animation-block__clear"
        @click="emit('clear')"
      >
        清除
      </ScenePropertyButton>
    </div>

    <ScenePropertyCollapse
      v-model="expandedGroups"
      class="scene-edit-property-animation-block__collapse"
    >
      <ScenePropertyCollapseItem
        v-for="group in groups"
        :key="group.label"
        :name="group.label"
        :title="group.label"
      >
        <div class="scene-edit-property-animation-block__grid">
          <ScenePropertyButton
            v-for="item in group.children"
            :key="item.value"
            native-type="button"
            class="scene-edit-property-animation-block__option"
            :class="{ 'is-active': model === item.value }"
            :aria-pressed="model === item.value"
            @mouseenter="emit('preview-start', item.value)"
            @mouseleave="emit('preview-end')"
            @click="model = item.value"
          >
            {{ item.label }}
          </ScenePropertyButton>
        </div>
      </ScenePropertyCollapseItem>
    </ScenePropertyCollapse>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyCollapse from '@/components/ScenePropertyCollapse/index.vue'
import ScenePropertyCollapseItem from '@/components/ScenePropertyCollapseItem/index.vue'

export type ScenePropertyAnimationOption = {
  label: string
  value: string
}

export type ScenePropertyAnimationGroup = {
  label: string
  children: readonly ScenePropertyAnimationOption[]
}

defineOptions({ name: 'ScenePropertyAnimationBlock' })

const props = withDefaults(
  defineProps<{
    title?: string
    groups: readonly ScenePropertyAnimationGroup[]
    clearable?: boolean
    emptyLabel?: string
  }>(),
  {
    title: '动画配置',
    /** 已选动画必须保留显式清除入口；不需要清除能力的只读场景可按需关闭。 */
    clearable: true,
    emptyLabel: '无',
  },
)

const emit = defineEmits<{
  /** 预览只描述交互意图，具体是否写入瞬时渲染态由业务适配层决定。 */
  (event: 'preview-start', value: string): void
  (event: 'preview-end'): void
  (event: 'clear'): void
}>()

const model = defineModel<string>({ default: '' })
/** Figma 默认仅展开第一个动画分类，避免长动画列表挤占右侧属性面板的主要视区。 */
const expandedGroups = ref<string[]>(props.groups[0] ? [props.groups[0].label] : [])

/** 设计稿展示“分组：动画名”，通过一次线性查找解析，动画列表规模很小且仅在选中值变化时执行。 */
const currentAnimationLabel = computed(() => {
  if (!model.value) return props.emptyLabel
  for (const group of props.groups) {
    const option = group.children.find((item) => item.value === model.value)
    if (option) return `${group.label}：${option.label}`
  }
  return model.value
})

/** 分组配置发生变化时恢复“仅展开首组”的设计初态；普通展开/折叠不会触发该监听。 */
watch(
  () => props.groups.map((group) => group.label),
  (labels) => {
    expandedGroups.value = labels[0] ? [labels[0]] : []
  },
)
</script>
