<template>
  <div>
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">整体布局</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="按钮间距"
          ><ScenePropertySlider
            v-model="option.gap"
            :min="0"
            :max="200"
            @update:model-value="notify"
        /></ScenePropertyRow>
        <ScenePropertyRow label="圆角"
          ><ScenePropertySlider
            v-model="option.borderRadius"
            :min="0"
            :max="100"
            @update:model-value="notify"
        /></ScenePropertyRow>
      </div>
    </section>
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">按钮文字</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow
          v-for="item in directions"
          :key="item.key"
          :label="item.label"
          control-fill
        >
          <ScenePropertyInput
            v-model="option[item.key].text"
            placeholder="文字及符号均可自由填写"
            @update:model-value="notify"
          />
        </ScenePropertyRow>
      </div>
    </section>
    <!-- 外观只配置一次，两个方向共用；按钮文案仍分别编辑。 -->
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">按钮样式</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="字体" control-fill>
          <ScenePropertySelect v-model="option.buttonStyle.fontFamily" @update:model-value="notify">
            <el-option label="默认字体" value="" />
            <el-option
              v-for="font in FONT_FAMILY_OPTIONS"
              :key="font.value"
              :label="font.label"
              :value="font.value"
            />
          </ScenePropertySelect>
        </ScenePropertyRow>
        <ScenePropertyRow label="字号"
          ><ScenePropertySlider
            v-model="option.buttonStyle.fontSize"
            :min="1"
            :max="200"
            @update:model-value="notify"
        /></ScenePropertyRow>
        <ScenePropertyRow label="斜体"
          ><ScenePropertySwitch v-model="option.buttonStyle.italic" @update:model-value="notify"
        /></ScenePropertyRow>
        <ScenePropertyRow label="加粗"
          ><ScenePropertySwitch v-model="option.buttonStyle.bold" @update:model-value="notify"
        /></ScenePropertyRow>
        <ScenePropertyRow v-for="field in colors" :key="field.key" :label="field.label">
          <ScenePropertyColorPicker
            v-model="option.buttonStyle[field.key]"
            :label="field.label"
            variant="swatch"
            show-alpha
            @update:model-value="notify"
          />
        </ScenePropertyRow>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
// eslint-disable-next-line max-len -- 使用已有唯一连续数值控件，不复制面板样式。
import ScenePropertySlider from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertySlider/index.vue'
// eslint-disable-next-line max-len -- 使用已有共享布尔控件。
import ScenePropertySwitch from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertySwitch/index.vue'
// eslint-disable-next-line max-len -- 使用已有唯一颜色控件。
import ScenePropertyColorPicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { RecordPaginationOption } from './config'

defineOptions({ name: 'VRecordPaginationConfigPanel' })
const props = defineProps<{ option: RecordPaginationOption }>()
const emit = defineEmits<{ 'update:option': [option: RecordPaginationOption] }>()
const directions = [
  { key: 'previous', label: '上一条文字' },
  { key: 'next', label: '下一条文字' },
] as const
const colors = [
  { key: 'color', label: '文字颜色' },
  { key: 'backgroundColor', label: '背景颜色' },
  { key: 'pressedColor', label: '按下文字色' },
  { key: 'pressedBackgroundColor', label: '按下背景色' },
] as const
/** 明确通知父面板失效当前组件缓存并记录历史，不新增整份配置的深度监听。 */
const notify = () => emit('update:option', props.option)
</script>
