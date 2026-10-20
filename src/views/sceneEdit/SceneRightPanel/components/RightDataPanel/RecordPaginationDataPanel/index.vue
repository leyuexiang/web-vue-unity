<template>
  <section class="scene-edit-property-section">
    <div class="scene-edit-property-section__header">逐条翻页适配</div>
    <div class="scene-edit-property-section__body">
      <ScenePropertyRow label="列表请求" control-fill>
        <ScenePropertySelect
          :model-value="binding.requestId"
          @update:model-value="update('requestId', String($event))"
        >
          <el-option
            v-for="request in remoteRequests"
            :key="request.id"
            :label="request.name"
            :value="request.id"
          />
        </ScenePropertySelect>
      </ScenePropertyRow>
      <ScenePropertyRow
        v-for="field in parameterFields"
        :key="field.key"
        :label="field.label"
        control-fill
      >
        <ScenePropertySelect
          :model-value="binding[field.key]"
          clearable
          placeholder="选择请求中已配置的参数"
          @update:model-value="update(field.key, String($event || ''))"
        >
          <el-option
            v-for="parameter in parameters"
            :key="parameter.value"
            :label="parameter.label"
            :value="parameter.value"
          />
        </ScenePropertySelect>
      </ScenePropertyRow>
      <ScenePropertyRow label="列表路径" control-fill
        ><ScenePropertyInput
          :model-value="binding.listPath"
          placeholder="例如 list；根数组时留空"
          @update:model-value="update('listPath', String($event))"
      /></ScenePropertyRow>
      <ScenePropertyRow label="总数路径" control-fill
        ><ScenePropertyInput
          :model-value="binding.totalPath"
          placeholder="例如 total"
          @update:model-value="update('totalPath', String($event))"
      /></ScenePropertyRow>
      <ScenePropertyRow label="第一页码" control-fill>
        <ScenePropertySelect
          :model-value="binding.firstPage"
          @update:model-value="update('firstPage', Number($event) as 0 | 1)"
        >
          <el-option label="从1开始" :value="1" /><el-option label="从0开始" :value="0" />
        </ScenePropertySelect>
      </ScenePropertyRow>
      <ScenePropertyRow label="每页条数"
        ><ScenePropertyNumberInput
          :model-value="binding.pageSize"
          :min="1"
          :max="10000"
          @update:model-value="update('pageSize', Number($event))"
      /></ScenePropertyRow>
      <p class="binding-hint">
        路径以数据预览中的原始返回值为准。当前记录的字段映射与详情刷新继续在“属性映射”和“交互”中配置。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getDataConfigRequests,
  type ComponentDataConfig,
  type PublicRequestConfig,
} from '@/types/data-config'
import type { RecordPaginationBinding } from '@/packages/components/Control/RecordPagination/config'
import {
  resolveRecordPaginationRequest,
  getRecordPaginationParameterOptions,
} from '@/utils/dataConfig/recordPaginationRequest'
import ScenePropertyRow from '../../PropertyControls/ScenePropertyRow/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
import ScenePropertyInput from '../../PropertyControls/ScenePropertyInput/index.vue'
import ScenePropertyNumberInput from '../../PropertyControls/ScenePropertyNumberInput/index.vue'

const props = defineProps<{
  binding: RecordPaginationBinding
  config: ComponentDataConfig
  publicRequests: PublicRequestConfig[]
}>()
const emit = defineEmits<{ 'update:binding': [value: RecordPaginationBinding] }>()
const parameterFields = [
  { key: 'pageParameter', label: '页码参数' },
  { key: 'sizeParameter', label: '条数参数' },
] as const
const remoteRequests = computed(() =>
  getDataConfigRequests(props.config).filter((item) =>
    ['ajax', 'public'].includes(item.request.type),
  ),
)
const parameters = computed(() =>
  getRecordPaginationParameterOptions(
    resolveRecordPaginationRequest(props.config, props.binding, props.publicRequests),
  ),
)
/** 更换列表请求后清空旧参数编码，禁止把另一个请求的同名字段错误复用。 */
const update = <K extends keyof RecordPaginationBinding>(
  key: K,
  value: RecordPaginationBinding[K],
) => {
  const binding = { ...props.binding, [key]: value }
  if (key === 'requestId') {
    binding.pageParameter = ''
    binding.sizeParameter = ''
  }
  emit('update:binding', binding)
}
</script>

<style scoped>
.binding-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--scene-edit-text-secondary, #8e959e);
}
</style>
