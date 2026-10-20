<template>
  <section :class="['request-config-section-card', { 'is-expanded': expanded }]">
    <button
      class="request-config-section-card__header"
      type="button"
      :aria-expanded="expanded"
      @click="emit('update:expanded', !expanded)"
    >
      <span class="request-config-section-card__identity">
        <img class="request-config-section-card__icon" :src="icon" alt="" aria-hidden="true" />
        <span class="request-config-section-card__copy">
          <strong>{{ title }}</strong>
          <small>{{ description }}</small>
        </span>
      </span>
      <span class="request-config-section-card__toggle">
        {{ expanded ? '收起' : '展开' }}
        <span
          :class="['scene-edit-collapse-icon', { 'is-expanded': expanded }]"
          aria-hidden="true"
        />
      </span>
    </button>

    <el-collapse-transition>
      <div v-show="expanded" class="request-config-section-card__content">
        <slot />
      </div>
    </el-collapse-transition>
  </section>
</template>

<script setup lang="ts">
/**
 * 请求配置弹窗的共享折叠卡片。
 * 全局公共配置和当前元素配置只提供业务表单，标题、说明、图标、折叠按钮及分隔线均由本组件统一，
 * 从而保证动态请求与公共接口复用同一套 Figma 卡片结构，而不会在业务子组件中复制视觉代码。
 */
defineProps<{
  title: string
  description: string
  icon: string
  expanded: boolean
}>()

const emit = defineEmits<{
  'update:expanded': [value: boolean]
}>()
</script>

<style scoped lang="scss">
.request-config-section-card {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 16px;
  background: #1b2630;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 2px;
}
.request-config-section-card__header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}
.request-config-section-card__identity {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
}
.request-config-section-card__icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
}
.request-config-section-card__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: normal;
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
    white-space: nowrap;
  }
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
    font-weight: 400;
    color: rgb(255 255 255 / 40%);
    white-space: nowrap;
  }
}
.request-config-section-card__toggle {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
  min-height: 22px;
  padding: 2px 4px;
  font-size: 11px;
  line-height: 16px;
  color: rgb(255 255 255 / 60%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 2px;
}
.request-config-section-card__toggle .scene-edit-collapse-icon {
  width: 14px;
  height: 14px;
}
.request-config-section-card__content {
  min-width: 0;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

/** 弹窗进入窄屏安全宽度后，说明文字可隐藏，但标题和折叠操作始终保留。 */
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 构建后为浏览器标准容器查询。 */
@#{'container'} scene-property-dialog (width <= 520px) {
  .request-config-section-card {
    padding: 12px;
  }
  .request-config-section-card__copy small {
    display: none;
  }
}
</style>
