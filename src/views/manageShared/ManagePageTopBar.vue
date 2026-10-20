<template>
  <header class="manage-page-top-bar">
    <div class="manage-page-top-bar__heading">
      <div class="manage-page-top-bar__heading-copy">
        <div class="manage-page-top-bar__title">{{ title }}</div>
        <div class="manage-page-top-bar__breadcrumb">{{ breadcrumb }}</div>
      </div>

      <div class="manage-page-top-bar__heading-actions">
        <!-- 右侧只渲染页面自身的业务操作；阶段三鉴权改由浏览器本地存储配置，不再占用页面交互区域。 -->
        <slot name="actions" />
      </div>
    </div>

    <div class="manage-page-top-bar__body">
      <!--
        模型和图标页使用归属页签，场景页不传 tabs 即不渲染该行。
        组件只派发选中值，不修改列表、分页或请求参数，接口语义继续由页面决定。
      -->
      <nav
        v-if="tabs.length"
        class="manage-page-top-bar__tabs"
        role="tablist"
        :aria-label="tabLabel"
      >
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="manage-page-top-bar__tab"
          :class="{ 'is-active': activeTab === tab.value }"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          @click="emit('tabChange', tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
export interface ManagePageTopTab {
  label: string
  value: string
}

defineOptions({ name: 'ManagePageTopBar' })

withDefaults(
  defineProps<{
    /** 标题和路径按页面传入，避免资源或场景业务名称写死在共享层。 */
    title: string
    breadcrumb: string
    /** 没有归属页签的页面传空数组，组件不会保留空白占位。 */
    tabs?: readonly ManagePageTopTab[]
    activeTab?: string
    tabLabel?: string
  }>(),
  {
    tabs: () => [],
    activeTab: '',
    tabLabel: '资源范围',
  },
)

const emit = defineEmits<{
  /** 只上报页签意图；是否请求、如何映射接口参数由页面自己处理。 */
  tabChange: [value: string]
}>()
</script>
