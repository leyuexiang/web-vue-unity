<template>
  <div>
    <!-- 分组和控件复用右侧属性面板，配置变更交给既有历史记录与保存链路。 -->
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">背景与边框</div>
      <div class="scene-edit-property-section__body">
        <template v-for="slot in imageSlots" :key="slot.key">
          <!-- 按下图片属于可选外观，按需展开配置；收起只改变面板展示，不删除已选择的图片。 -->
          <ScenePropertyRow
            v-if="slot.key === 'pressed'"
            label="配置按下图"
            title="可选项：未设置按下图片时，沿用普通背景和按压动效。"
          >
            <ScenePropertySwitch
              v-model="showPressedImageSettings"
              aria-label="配置按下背景（可选）"
            />
          </ScenePropertyRow>
          <template v-if="slot.key === 'normal' || showPressedImageSettings">
            <ScenePropertyRow :label="slot.key === 'normal' ? '普通来源' : '按下来源'" control-fill>
              <ScenePropertySelect
                :model-value="option.images[slot.key].sourceType"
                @update:model-value="changeImageSource(slot.key, $event)"
              >
                <el-option label="外部资源" value="external" />
                <el-option label="资源市场" value="resource-market" />
              </ScenePropertySelect>
            </ScenePropertyRow>
            <ScenePropertyRow :label="slot.label" control-fill>
              <ScenePropertyInput
                v-if="option.images[slot.key].sourceType === 'external'"
                v-model="option.images[slot.key].value"
                @update:model-value="emitOptionChange"
                placeholder="请输入图片链接，留空不使用"
              />
              <ScenePropertyImageResourcePicker
                v-else
                v-model="option.images[slot.key].value"
                @update:model-value="emitOptionChange"
                v-model:resource-key="option.images[slot.key].resourceKey"
                @update:resource-key="emitOptionChange"
              />
            </ScenePropertyRow>
            <ScenePropertyRow :label="slot.key === 'normal' ? '普通适应' : '按下适应'" control-fill>
              <ScenePropertySelect
                v-model="option.images[slot.key].fit"
                @update:model-value="emitOptionChange"
              >
                <el-option label="拉伸" value="fill" />
                <el-option label="包含" value="contain" />
                <el-option label="覆盖" value="cover" />
              </ScenePropertySelect>
            </ScenePropertyRow>
          </template>
        </template>
        <ScenePropertyRow label="背景颜色">
          <ScenePropertyColorPicker
            v-model="option.backgroundColor"
            @update:model-value="emitOptionChange"
            label="背景颜色"
            variant="swatch"
            show-alpha
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="边框颜色">
          <ScenePropertyColorPicker
            v-model="option.borderColor"
            @update:model-value="emitOptionChange"
            label="边框颜色"
            variant="swatch"
            show-alpha
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="边框宽度">
          <ScenePropertyNumberInput
            v-model="option.borderWidth"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="100"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="圆角">
          <ScenePropertyNumberInput
            v-model="option.borderRadius"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="1000"
          />
        </ScenePropertyRow>
      </div>
    </section>
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">按钮文字</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="文案" control-fill>
          <ScenePropertyInput
            v-model="option.text.value"
            @update:model-value="emitOptionChange"
            type="textarea"
            :rows="3"
            placeholder="请输入按钮文字"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="字体" control-fill>
          <ScenePropertySelect
            v-model="option.text.fontFamily"
            @update:model-value="emitOptionChange"
            placeholder="沿用默认字体"
          >
            <el-option label="沿用默认字体" value="" />
            <el-option
              v-for="font in FONT_FAMILY_OPTIONS"
              :key="font.value"
              :label="font.label"
              :value="font.value"
            />
          </ScenePropertySelect>
        </ScenePropertyRow>
        <ScenePropertyRow label="字号">
          <ScenePropertyNumberInput
            v-model="option.text.fontSize"
            @update:model-value="emitOptionChange"
            :min="1"
            :max="500"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="文字颜色">
          <ScenePropertyColorPicker
            v-model="option.text.fontColor"
            @update:model-value="emitOptionChange"
            label="文字颜色"
            variant="swatch"
            show-alpha
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="加粗"
          ><ScenePropertySwitch v-model="option.text.bold" @update:model-value="emitOptionChange"
        /></ScenePropertyRow>
        <ScenePropertyRow label="行高">
          <ScenePropertyNumberInput
            v-model="option.text.lineHeight"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="1000"
            title="0 为默认行高"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="字间距">
          <ScenePropertyNumberInput
            v-model="option.text.letterSpacing"
            @update:model-value="emitOptionChange"
            :min="-50"
            :max="100"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="自动换行"
          ><ScenePropertySwitch v-model="option.text.wrap" @update:model-value="emitOptionChange"
        /></ScenePropertyRow>
        <ScenePropertyRow label="水平对齐" control-fill>
          <ScenePropertySelect v-model="option.text.align" @update:model-value="emitOptionChange">
            <el-option label="左对齐" value="left" />
            <el-option label="居中" value="center" />
            <el-option label="右对齐" value="right" />
            <el-option label="两端对齐" value="justify" />
          </ScenePropertySelect>
        </ScenePropertyRow>
        <ScenePropertyRow label="垂直对齐" control-fill>
          <ScenePropertySelect
            v-model="option.text.verticalAlign"
            @update:model-value="emitOptionChange"
          >
            <el-option label="顶部" value="top" />
            <el-option label="居中" value="center" />
            <el-option label="底部" value="bottom" />
          </ScenePropertySelect>
        </ScenePropertyRow>
      </div>
    </section>
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">文字容器</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="横向偏移">
          <ScenePropertyNumberInput
            v-model="option.text.x"
            @update:model-value="emitOptionChange"
            :min="-10000"
            :max="10000"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="纵向偏移">
          <ScenePropertyNumberInput
            v-model="option.text.y"
            @update:model-value="emitOptionChange"
            :min="-10000"
            :max="10000"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="宽度">
          <ScenePropertyNumberInput
            v-model="option.text.width"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="10000"
            title="0 为铺满按钮宽度"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="高度">
          <ScenePropertyNumberInput
            v-model="option.text.height"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="10000"
            title="0 为铺满按钮高度"
          />
        </ScenePropertyRow>
      </div>
    </section>
    <section class="scene-edit-property-section">
      <div class="scene-edit-property-section__header">按压效果</div>
      <div class="scene-edit-property-section__body">
        <ScenePropertyRow label="启用动效"
          ><ScenePropertySwitch
            v-model="option.press.enabled"
            @update:model-value="emitOptionChange"
        /></ScenePropertyRow>
        <!-- 连续效果参数使用共享滑块；关闭动效只禁用参数编辑，不影响点击事件或按下背景。 -->
        <ScenePropertyRow label="缩放比例" control-fill>
          <ScenePropertySlider
            v-model="option.press.scale"
            @update:model-value="emitOptionChange"
            :min="50"
            :max="100"
            :disabled="!option.press.enabled"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="下移距离" control-fill>
          <ScenePropertySlider
            v-model="option.press.offsetY"
            @update:model-value="emitOptionChange"
            :min="0"
            :max="20"
            :step="0.5"
            :disabled="!option.press.enabled"
          />
        </ScenePropertyRow>
        <ScenePropertyRow label="亮度比例" control-fill>
          <ScenePropertySlider
            v-model="option.press.brightness"
            @update:model-value="emitOptionChange"
            :min="20"
            :max="100"
            :disabled="!option.press.enabled"
          />
        </ScenePropertyRow>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
import ScenePropertyNumberInput from '@/components/ScenePropertyNumberInput/index.vue'
import ScenePropertySwitch from '@/components/ScenePropertySwitch/index.vue'
import ScenePropertyImageResourcePicker from '@/components/ScenePropertyImageResourcePicker/index.vue'
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
// eslint-disable-next-line max-len -- 复用右侧属性面板唯一的连续数值控件。
import ScenePropertySlider from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertySlider/index.vue'
// eslint-disable-next-line max-len -- 复用右侧属性面板唯一的颜色控件。
import ScenePropertyColorPicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { ButtonImageKey, ButtonOption } from './config'

defineOptions({ name: 'VButtonConfigPanel' })
const props = defineProps<{ option: ButtonOption }>()
const emit = defineEmits<{ 'update:option': [value: ButtonOption] }>()

/**
 * 新按钮默认收起可选的按下图片配置；已有图片按地址或稳定编号自动展开，便于继续编辑。
 * 展开状态只属于属性面板，不写入场景，也不产生撤销记录；切换按钮时面板随实例重新初始化。
 */
const showPressedImageSettings = ref(
  Boolean(
    props.option.images.pressed.value.trim() || props.option.images.pressed.resourceKey?.trim(),
  ),
)

/**
 * 各控件完成配置写入后显式通知父面板，由父面板合并撤销快照、失效当前画布缓存。
 * 不对整份 option 增加深度监听，因此撤销回放和预览配置变化不会被再次记成用户编辑。
 */
const emitOptionChange = () => emit('update:option', props.option)
const imageSlots: Array<{ key: ButtonImageKey; label: string }> = [
  { key: 'normal', label: '普通背景' },
  { key: 'pressed', label: '按下背景' },
]

/** 切换来源时同时清除旧地址与编号，避免外部图片被误登记成市场资源。 */
const changeImageSource = (key: ButtonImageKey, value: unknown) => {
  if (value !== 'external' && value !== 'resource-market') return
  const image = props.option.images[key]
  if (image.sourceType === value) return
  image.sourceType = value
  image.value = ''
  delete image.resourceKey
  emitOptionChange()
}
</script>
