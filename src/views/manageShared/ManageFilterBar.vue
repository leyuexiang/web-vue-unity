<template>
  <section class="manage-filter-bar" :aria-label="label">
    <!--
      共享层只建立字段组和操作组的稳定几何，不读取或修改任何页面筛选状态。
      各页面通过插槽保留自己的双向绑定、选项来源和请求触发策略，避免业务参数泄漏到公共组件。
    -->
    <div class="manage-filter-bar__fields" :class="fieldsClass">
      <slot />
    </div>

    <div v-if="$slots.actions" class="manage-filter-bar__actions" :class="actionsClass">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'ManageFilterBar' })

withDefaults(
  defineProps<{
    /** 为不同管理页提供准确的可访问名称，不把页面业务名称写死在共享组件中。 */
    label: string
    /** 兼容渐进迁移期间已有的页面级验收选择器；稳定后可随旧样式统一清理。 */
    fieldsClass?: string
    /** 兼容渐进迁移期间已有的操作区选择器，不改变插槽内按钮的事件绑定。 */
    actionsClass?: string
  }>(),
  {
    fieldsClass: '',
    actionsClass: '',
  },
)
</script>
