<template>
  <div class="quiz-config-panel">
    <setting-item-box name="默认标题" :alone="true">
      <ScenePropertyInput v-model="labels.title" placeholder="题库未提供标题时使用" />
    </setting-item-box>

    <!-- 接口未返回的设计文案统一保存在组件配置中，避免更换题库后又变回写死的业务名称。 -->
    <setting-item-box name="界面文案" :alone="true">
      <div v-for="field in labelFields" :key="field.key" class="quiz-config-panel__row">
        <label>{{ field.label }}</label>
        <ScenePropertyInput v-model="labels[field.key]" :placeholder="field.label" />
      </div>
    </setting-item-box>

    <!-- 进度位置沿用文字区域配置；颜色及条高独立设置，不参与题库和作答状态。 -->
    <setting-item-box name="答题进度条" :alone="true">
      <div class="quiz-config-panel__row">
        <label>进度颜色</label>
        <ScenePropertyColorPicker v-model="progress.color" label="进度颜色" variant="swatch" />
      </div>
      <div class="quiz-config-panel__row">
        <label>轨道颜色</label>
        <ScenePropertyColorPicker v-model="progress.trackColor" label="轨道颜色" variant="swatch" />
      </div>
      <div class="quiz-config-panel__row">
        <label>进度条高度</label>
        <ScenePropertyNumberInput v-model="progress.height" :min="1" :max="20" size="small" />
      </div>
    </setting-item-box>

    <setting-item-box name="图片配置" :alone="true">
      <ScenePropertySelect v-model="selectedImageKey" size="small" aria-label="选择测验图片位">
        <el-option
          v-for="item in imageFields"
          :key="item.key"
          :label="item.label"
          :value="item.key"
        />
      </ScenePropertySelect>
      <ScenePropertySelect
        :model-value="currentImage.sourceType"
        size="small"
        aria-label="测验图片来源"
        @update:model-value="changeImageSource"
      >
        <el-option label="外部资源" value="external" />
        <el-option label="资源市场" value="resource-market" />
      </ScenePropertySelect>
      <ScenePropertyInput
        v-if="currentImage.sourceType === 'external'"
        v-model="currentImage.value"
        placeholder="请输入在线图片链接"
      />
      <ScenePropertyImageResourcePicker
        v-else
        v-model="currentImage.value"
        v-model:resource-key="currentImage.resourceKey"
      />
      <ScenePropertySelect v-model="currentImage.fit" size="small" aria-label="图片适应方式">
        <el-option label="包含" value="contain" />
        <el-option label="覆盖" value="cover" />
        <el-option label="拉伸" value="fill" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="文字区域" :alone="true">
      <ScenePropertySelect v-model="selectedTextKey" size="small" aria-label="选择文字区域">
        <el-option
          v-for="item in textFields"
          :key="item.key"
          :label="item.label"
          :value="item.key"
        />
      </ScenePropertySelect>
      <div class="quiz-config-panel__row">
        <label>横向位置</label>
        <ScenePropertyNumberInput
          v-model="currentTextBox.x"
          :min="-1000"
          :max="2000"
          size="small"
        />
      </div>
      <div class="quiz-config-panel__row">
        <label>纵向位置</label>
        <ScenePropertyNumberInput
          v-model="currentTextBox.y"
          :min="-1000"
          :max="2000"
          size="small"
        />
      </div>
      <div class="quiz-config-panel__row">
        <label>文本框宽度</label>
        <ScenePropertyNumberInput
          v-model="currentTextBox.width"
          :min="1"
          :max="2000"
          size="small"
        />
      </div>
      <div class="quiz-config-panel__row">
        <label>文本框高度</label>
        <ScenePropertyNumberInput
          v-model="currentTextBox.height"
          :min="1"
          :max="1200"
          size="small"
        />
      </div>
      <div class="quiz-config-panel__row">
        <label>字号</label>
        <ScenePropertyNumberInput
          v-model="currentTextBox.fontSize"
          :min="5"
          :max="160"
          size="small"
        />
      </div>
      <div class="quiz-config-panel__row">
        <label>文字颜色</label>
        <ScenePropertyColorPicker
          v-model="currentTextBox.color"
          label="文字颜色"
          variant="swatch"
        />
      </div>
      <ScenePropertySelect v-model="currentTextBox.fontFamily" size="small" aria-label="文字字体">
        <el-option label="沿用默认字体" value="" />
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
      <ScenePropertySelect v-model="currentTextBox.fontWeight" size="small" aria-label="文字粗细">
        <el-option label="常规" value="normal" />
        <el-option label="加粗" value="bold" />
      </ScenePropertySelect>
      <ScenePropertyButton size="small" plain @click="restoreCurrentTextBox">
        恢复当前文字布局
      </ScenePropertyButton>
    </setting-item-box>

    <setting-item-box name="选项布局" :alone="true">
      <ScenePropertySelect
        v-model="option.optionsLayout.mode"
        size="small"
        aria-label="选项排版模式"
      >
        <el-option label="自动排版" value="auto" />
        <el-option label="自定义位置" value="custom" />
      </ScenePropertySelect>
      <template v-if="option.optionsLayout.mode === 'auto'">
        <div class="quiz-config-panel__row">
          <label>每行列数</label>
          <ScenePropertyNumberInput
            v-model="option.optionsLayout.columns"
            :min="1"
            :max="4"
            size="small"
          />
        </div>
        <div class="quiz-config-panel__row">
          <label>水平间距</label>
          <ScenePropertyNumberInput
            v-model="option.optionsLayout.gapX"
            :min="0"
            :max="120"
            size="small"
          />
        </div>
        <div class="quiz-config-panel__row">
          <label>垂直间距</label>
          <ScenePropertyNumberInput
            v-model="option.optionsLayout.gapY"
            :min="0"
            :max="120"
            size="small"
          />
        </div>
      </template>
      <template v-else>
        <ScenePropertySelect
          :model-value="selectedSlotIndex"
          size="small"
          aria-label="选择选项位置槽位"
          @update:model-value="selectSlot"
        >
          <el-option
            v-for="index in SLOT_LIMIT"
            :key="index - 1"
            :label="`选项 ${index}`"
            :value="index - 1"
          />
        </ScenePropertySelect>
        <div class="quiz-config-panel__row">
          <label>按钮横向位置</label>
          <ScenePropertyNumberInput v-model="currentSlot.x" :min="-1000" :max="2000" size="small" />
        </div>
        <div class="quiz-config-panel__row">
          <label>按钮纵向位置</label>
          <ScenePropertyNumberInput v-model="currentSlot.y" :min="-1000" :max="2000" size="small" />
        </div>
        <div class="quiz-config-panel__row">
          <label>按钮宽度</label>
          <ScenePropertyNumberInput v-model="currentSlot.width" :min="1" :max="2000" size="small" />
        </div>
        <div class="quiz-config-panel__row">
          <label>按钮高度</label>
          <ScenePropertyNumberInput
            v-model="currentSlot.height"
            :min="1"
            :max="1200"
            size="small"
          />
        </div>
      </template>
      <div class="quiz-config-panel__row">
        <label>按钮横向位置</label>
        <ScenePropertyNumberInput v-model="option.button.x" :min="-1000" :max="2000" size="small" />
      </div>
      <div class="quiz-config-panel__row">
        <label>按钮纵向位置</label>
        <ScenePropertyNumberInput v-model="option.button.y" :min="-1000" :max="2000" size="small" />
      </div>
      <div class="quiz-config-panel__row">
        <label>按钮宽度</label>
        <ScenePropertyNumberInput v-model="option.button.width" :min="1" :max="2000" size="small" />
      </div>
      <div class="quiz-config-panel__row">
        <label>按钮高度</label>
        <ScenePropertyNumberInput
          v-model="option.button.height"
          :min="1"
          :max="1200"
          size="small"
        />
      </div>
      <ScenePropertyButton size="small" plain @click="restoreLayout"
        >恢复默认布局</ScenePropertyButton
      >
    </setting-item-box>

    <setting-item-box name="答题行为" :alone="true">
      <div class="quiz-config-panel__row">
        <label>正确提示</label>
        <ScenePropertyInput v-model="option.interaction.correctText" />
      </div>
      <div class="quiz-config-panel__row">
        <label>错误提示</label>
        <ScenePropertyInput v-model="option.interaction.incorrectText" />
      </div>
      <div class="quiz-config-panel__row">
        <label>下一题文案</label>
        <ScenePropertyInput v-model="option.interaction.nextText" />
      </div>
      <div class="quiz-config-panel__row">
        <label>完成文案</label>
        <ScenePropertyInput v-model="option.interaction.finishText" />
      </div>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import ScenePropertyImageResourcePicker from '@/components/ScenePropertyImageResourcePicker/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertyNumberInput from '@/components/ScenePropertyNumberInput/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
// eslint-disable-next-line max-len -- 复用右侧属性面板中已接入主题样式的颜色控件。
import ScenePropertyColorPicker from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import {
  createDefaultQuizButton,
  createDefaultQuizLabels,
  createDefaultQuizOptionsLayout,
  createDefaultQuizProgress,
  createDefaultQuizTextBoxes,
  createQuizOptionSlot,
} from './quizLayout'
import type { QuizImageKey, QuizImageSource, QuizLabels, QuizOption } from './type'

defineOptions({ name: 'VQuizConfigPanel' })
const props = defineProps({ option: { type: Object as PropType<QuizOption>, required: true } })
const option = props.option
// 补齐界面文案的缺省字段，但保留空字符串，允许用户主动隐藏解析标题等提示。
option.labels = { ...createDefaultQuizLabels(), ...option.labels }
const labels = computed(() => option.labels!)
// 仅在打开旧组件配置时补齐一次新增样式字段，避免在计算属性内写入配置。
option.progress ??= createDefaultQuizProgress()
const progress = computed(() => option.progress!)
const SLOT_LIMIT = 32
const selectedImageKey = ref<QuizImageKey>('background')
const selectedTextKey = ref<keyof QuizOption['text']>('stem')
const selectedSlotIndex = ref(0)

/** 默认标题单独编辑；其余固定文案按用途展示，不作为题库接口映射目标。 */
const labelFields: Array<{ key: Exclude<keyof QuizLabels, 'title'>; label: string }> = [
  { key: 'progress', label: '进度标题' },
  { key: 'questionPrefix', label: '题号前缀' },
  { key: 'questionSuffix', label: '题号单位' },
  { key: 'completed', label: '完成提示' },
  { key: 'correctAnswer', label: '答案提示' },
  { key: 'explanation', label: '解析标题' },
  { key: 'score', label: '完成页提示' },
]

/** 标题装饰由整体背景承载；面板只列出可独立替换的七个图片位。 */
const imageFields: Array<{ key: QuizImageKey; label: string }> = [
  { key: 'background', label: '整体背景' },
  { key: 'option', label: '选项按钮' },
  { key: 'optionSelected', label: '选中选项' },
  { key: 'optionCorrect', label: '正确选项' },
  { key: 'optionIncorrect', label: '错误选项' },
  { key: 'feedback', label: '判题提示框' },
  { key: 'nextButton', label: '下一题按钮' },
]
const textFields: Array<{ key: keyof QuizOption['text']; label: string }> = [
  { key: 'title', label: '测验标题' },
  { key: 'progress', label: '答题进度' },
  { key: 'stem', label: '题干' },
  { key: 'optionIndex', label: '选项序号' },
  { key: 'optionText', label: '选项内容' },
  { key: 'feedback', label: '判题提示' },
  { key: 'explanation', label: '解释内容' },
  { key: 'nextButton', label: '按钮文字' },
  { key: 'score', label: '完成摘要' },
  { key: 'status', label: '状态提示' },
]

function ensureSlot(index: number) {
  while (option.optionsLayout.slots.length <= index) {
    option.optionsLayout.slots.push(
      createQuizOptionSlot(option.optionsLayout.slots.length, option.optionsLayout.columns),
    )
  }
}

// 旧场景可能没有首个槽位；在建立响应式读取前补一次，避免 computed 内产生写操作。
ensureSlot(selectedSlotIndex.value)

const currentImage = computed(() => option.images[selectedImageKey.value])
const currentTextBox = computed(() => option.text[selectedTextKey.value])
const currentSlot = computed(() => option.optionsLayout.slots[selectedSlotIndex.value])

/** 过滤通用下拉框可能透出的空值和非数字值，避免误建无效布局槽位。 */
function selectSlot(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return
  const index = Number(value)
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_LIMIT) return
  selectedSlotIndex.value = index
  ensureSlot(selectedSlotIndex.value)
}

/** 只接受图片来源枚举；切换来源时清除另一来源留下的地址和稳定编号。 */
function changeImageSource(value: unknown) {
  if (value !== 'external' && value !== 'resource-market') return
  const source: QuizImageSource = value
  if (source === currentImage.value.sourceType) return
  currentImage.value.sourceType = source
  currentImage.value.value = ''
  currentImage.value.resourceKey = ''
}

/** 恢复设计稿的全部默认布局及进度外观，保留题库、图片、界面文案和交互文案。 */
function restoreLayout() {
  option.text = createDefaultQuizTextBoxes()
  option.progress = createDefaultQuizProgress()
  option.button = createDefaultQuizButton()
  option.optionsLayout = createDefaultQuizOptionsLayout()
  selectedSlotIndex.value = 0
}

/** 只恢复当前文字区域的坐标、尺寸和样式，不影响其他区域或题库。 */
function restoreCurrentTextBox() {
  const defaults = createDefaultQuizTextBoxes()
  option.text[selectedTextKey.value] = defaults[selectedTextKey.value]
}
</script>

<style scoped lang="scss">
.quiz-config-panel {
  display: grid;
  gap: 8px;
}
.quiz-config-panel__row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 32px;
}
.quiz-config-panel__row label {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}
</style>
