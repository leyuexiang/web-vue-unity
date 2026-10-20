<template>
  <RequestConfigSectionCard
    title="全局公共配置"
    description="配置全局通用的请求参数和设置"
    :icon="globalConfigIcon"
    :expanded="expanded"
    @update:expanded="emit('update:expanded', $event)"
  >
    <div class="rgc-service-row">
      <span class="rgc-service-row__label">服务</span>
      <div class="rgc-service-row__controls">
        <ScenePropertyInput
          :model-value="config.requestOriginUrl"
          :readonly="editDisabled"
          placeholder="例：http://127.0.0.1/"
          @update:model-value="updateField('requestOriginUrl', $event as string)"
        />
        <ScenePropertyNumberInput
          :model-value="config.requestInterval ?? 0"
          :min="0"
          :controls="false"
          :readonly="editDisabled"
          class="rgc-interval-number"
          placeholder="请输入数字"
          @update:model-value="updateField('requestInterval', $event as number)"
        />
        <ScenePropertySelect
          :model-value="config.requestIntervalUnit || 'second'"
          :disabled="editDisabled"
          class="rgc-interval-unit"
          @update:model-value="updateField('requestIntervalUnit', $event as string)"
        >
          <el-option label="秒" value="second" />
          <el-option label="分" value="minute" />
          <el-option label="时" value="hour" />
          <el-option label="天" value="day" />
        </ScenePropertySelect>
        <ScenePropertyButton v-if="editDisabled" class="rgc-edit-button" @click="enableEdit">
          编辑配置
        </ScenePropertyButton>
      </div>
    </div>

    <div class="rgc-header-table">
      <div class="rgc-tab-title">Header</div>
      <KeyValueEditor
        :model-value="config.requestParams?.Header || {}"
        :readonly="editDisabled"
        @update:model-value="updateParams('Header', $event)"
      />
    </div>
  </RequestConfigSectionCard>
</template>

<script setup lang="ts">
import type { RequestGlobalConfig } from '@/types/data-config'
import globalConfigIcon from '@/assets/icons/request-config-global.svg'
import KeyValueEditor from '../KeyValueEditor/index.vue'
import RequestConfigSectionCard from '../RequestConfigSectionCard/index.vue'

const props = defineProps<{
  config: RequestGlobalConfig
  editDisabled: boolean
  expanded: boolean
}>()

const emit = defineEmits<{
  'update:config': [config: RequestGlobalConfig]
  'update:editDisabled': [value: boolean]
  'update:expanded': [value: boolean]
}>()

function enableEdit() {
  emit('update:editDisabled', false)
}

function updateField(field: string, value: unknown) {
  /** 只复制当前层级，避免编辑全局服务字段时触发与请求参数无关的深层响应更新。 */
  const next = { ...props.config }
  ;(next as Record<string, unknown>)[field] = value
  emit('update:config', next)
}

function updateParams(section: 'Params' | 'Header', value: Record<string, string>) {
  const next = { ...props.config }
  if (!next.requestParams) return
  next.requestParams = { ...next.requestParams, [section]: value }
  emit('update:config', next)
}
</script>

<style scoped lang="scss">
.rgc-service-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-width: 0;
  margin-bottom: 24px;
}
.rgc-service-row__label {
  font-size: 14px;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
}
.rgc-service-row__controls {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 60px 60px auto;
  gap: 8px;
  min-width: 0;
}
.rgc-interval-number,
.rgc-interval-unit {
  width: 60px;
}
.rgc-edit-button {
  white-space: nowrap;
}
.rgc-header-table {
  min-width: 0;
  overflow: hidden;
  background: #1d2a35;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 2px;
}
.rgc-tab-title {
  position: relative;
  height: 39px;
  padding: 10px 12px 8px;
  font-size: 13px;
  line-height: 20px;
  color: #5ab2a5;
  background: #131c26;
  border-bottom: 1px solid rgb(255 255 255 / 5%);
  &::after {
    position: absolute;
    bottom: 0;
    left: 22px;
    width: 25px;
    height: 2px;
    content: '';
    background: #5ab2a5;
  }
}

/** 小视口下服务字段改为两列流式布局，业务语义不变且不会出现横向滚动。 */
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 构建后为浏览器标准容器查询。 */
@#{'container'} scene-property-dialog (width <= 620px) {
  .rgc-service-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .rgc-service-row__controls {
    grid-template-columns: minmax(0, 1fr) 60px 60px;
  }
  .rgc-edit-button {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
