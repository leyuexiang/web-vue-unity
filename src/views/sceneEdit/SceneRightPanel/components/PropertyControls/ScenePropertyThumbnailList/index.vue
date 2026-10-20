<template>
  <!-- 普通二维组件直接保存图片地址，因此列表只负责地址的上传、编辑、增删。 -->
  <div class="scene-edit-property-thumbnail-list">
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="scene-edit-property-thumbnail-list__row"
    >
      <ScenePropertyUpload
        :model-value="item"
        :disabled="disabled"
        @update:model-value="updateItem(index, $event)"
        @upload-error="emit('upload-error', $event)"
      />
      <ScenePropertyInput
        :model-value="item"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="updateItem(index, String($event ?? ''))"
      />
      <ScenePropertyButton
        text
        class="scene-edit-property-thumbnail-list__remove"
        native-type="button"
        :icon="Delete"
        :disabled="disabled"
        :aria-label="`删除第 ${index + 1} 张图片`"
        @click="removeItem(index)"
      />
    </div>

    <ScenePropertyButton
      class="scene-edit-property-thumbnail-list__add"
      native-type="button"
      :icon="Plus"
      :disabled="!canAdd"
      @click="addItem"
    >
      {{ addLabel }}
    </ScenePropertyButton>

    <p v-if="hasFiniteLimit" class="scene-edit-property-thumbnail-list__limit">
      最多上传 {{ normalizedMax }} 张图片
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertyUpload from '@/components/ScenePropertyUpload/index.vue'

const props = withDefaults(
  defineProps<{
    /** 图片地址数组；空字符串代表已新增、尚未录入或上传的占位行。 */
    modelValue?: string[]
    /** 最大图片数；未传或非有限值时不限制。 */
    max?: number
    placeholder?: string
    addLabel?: string
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    max: Number.POSITIVE_INFINITY,
    placeholder: '请输入图片地址',
    addLabel: '新增图片',
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void
  /** 每次增删改同时发出 change，兼容需要立即同步序列化配置的调用方。 */
  (event: 'change', value: string[]): void
  (event: 'upload-error', error: Error): void
}>()

const normalizedMax = computed(() =>
  Number.isFinite(props.max) ? Math.max(Math.floor(props.max), 0) : Number.POSITIVE_INFINITY,
)
const hasFiniteLimit = computed(() => Number.isFinite(normalizedMax.value))
const canAdd = computed(() => !props.disabled && props.modelValue.length < normalizedMax.value)

/** 使用新数组写回，确保父组件、计算属性和历史记录能可靠观察到每次变更。 */
const commit = (nextValue: string[]) => {
  emit('update:modelValue', nextValue)
  emit('change', nextValue)
}

const updateItem = (index: number, value: string) => {
  if (props.disabled || index < 0 || index >= props.modelValue.length) return
  const nextValue = [...props.modelValue]
  nextValue[index] = value
  commit(nextValue)
}

const addItem = () => {
  if (!canAdd.value) return
  commit([...props.modelValue, ''])
}

const removeItem = (index: number) => {
  if (props.disabled || index < 0 || index >= props.modelValue.length) return
  commit(props.modelValue.filter((_, itemIndex) => itemIndex !== index))
}
</script>
