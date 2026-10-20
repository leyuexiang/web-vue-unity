<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="标签字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="当前值" :alone="true">
      <ScenePropertyInput v-model="option.value" />
    </setting-item-box>

    <setting-item-box name="样式" :alone="true">
      <ScenePropertySelect v-model="option.tabType" size="small">
        <el-option label="分段" value="segment" />
        <el-option label="下划线" value="line" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="选项列表(JSON)" :alone="true">
      <ScenePropertyInput
        v-model="optionsText"
        type="textarea"
        :rows="5"
        @blur="applyOptionsText"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { ref, watch, type PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VInputsTabConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

/**
 * 标签选择器的选项列表是数组结构。
 * 这里用 JSON 文本作为编辑缓冲，失焦时统一解析，避免边输边改数组导致表单状态抖动。
 */
const optionsText = ref('')

watch(
  () => props.option.options,
  (newValue) => {
    optionsText.value = JSON.stringify(newValue ?? [], null, 2)
  },
  {
    immediate: true,
    deep: true,
  },
)

const applyOptionsText = () => {
  try {
    const parsed = JSON.parse(optionsText.value)
    if (Array.isArray(parsed)) {
      props.option.options = parsed
    }
  } catch {
    optionsText.value = JSON.stringify(props.option.options ?? [], null, 2)
  }
}
</script>
