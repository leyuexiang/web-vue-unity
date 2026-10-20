<template>
  <section
    v-show="!closed"
    class="quiz-widget"
    :class="{ 'quiz-widget--empty': displayQuestions.length === 0 }"
    :style="rootStyle"
    aria-label="答题测验"
    @click.stop
  >
    <img
      v-if="imageUrl('background')"
      class="quiz-widget__background"
      :src="imageUrl('background')"
      :style="imageFit('background')"
      alt=""
      draggable="false"
    />
    <!-- 公共标题栏在答题、完成和空题库状态下保持一致；编辑态不执行关闭。 -->
    <div class="quiz-widget__text quiz-widget__title" :style="textStyle(option.text.title)">
      {{ option.title || labels.title }}
    </div>
    <button
      class="quiz-widget__close"
      :style="closeStyle"
      type="button"
      aria-label="关闭答题"
      :disabled="!isPreview"
      @click.stop.prevent="close"
    >
      <img :src="quizAssets.close" alt="" draggable="false" />
    </button>
    <div class="quiz-widget__divider quiz-widget__header-divider" :style="headerDividerStyle">
      <img :src="quizAssets.divider" alt="" draggable="false" />
    </div>
    <div v-if="!finished && currentQuestion" class="quiz-widget__content">
      <!-- 题号表示正在查看的题目；进度条及底部计数只统计已提交的题目。 -->
      <div class="quiz-widget__progress" :style="progressStyle">
        <div class="quiz-widget__progress-labels">
          <span>{{ labels.progress }}</span>
          <span class="quiz-widget__counter">
            {{ labels.questionPrefix }} <b>{{ currentIndex + 1 }}</b
            ><span>/{{ displayQuestions.length }}</span> {{ labels.questionSuffix }}
          </span>
        </div>
        <div class="quiz-widget__progress-track">
          <VProgressBar :option="progressBarOption" />
        </div>
      </div>
      <div class="quiz-widget__text quiz-widget__stem" :style="textStyle(option.text.stem)">
        {{ currentQuestion.stem }}
      </div>

      <div
        class="quiz-widget__options"
        :class="`quiz-widget__options--${option.optionsLayout.mode}`"
        :style="optionsStyle"
      >
        <button
          v-for="(answer, answerIndex) in currentQuestion.options"
          :key="answer.id"
          class="quiz-widget__answer"
          :class="answerClass(answer.id)"
          :style="answerStyle(answerIndex)"
          type="button"
          :disabled="!isPreview || selectedOptionId !== ''"
          :aria-pressed="selectedOptionId === answer.id"
          @click.stop.prevent="submitAnswer(answer.id)"
        >
          <img
            v-if="answerImage(answer.id)"
            class="quiz-widget__answer-background"
            :src="answerImage(answer.id)"
            :style="answerImageFit(answer.id)"
            alt=""
            draggable="false"
          />
          <span
            class="quiz-widget__text quiz-widget__answer-index"
            :style="textStyle(option.text.optionIndex)"
          >
            {{ QUIZ_OPTION_INDEX_LABELS[answerIndex] || `${answerIndex + 1}.` }}
          </span>
          <span class="quiz-widget__text quiz-widget__answer-copy" :style="answerTextStyle">
            {{ answer.text }}
          </span>
          <img
            v-if="selectedOptionId && answer.id === currentQuestion.correctOptionId"
            class="quiz-widget__answer-check"
            :src="quizAssets.check"
            alt="正确选项"
            draggable="false"
          />
          <span
            v-else-if="selectedOptionId === answer.id"
            class="quiz-widget__incorrect-icon quiz-widget__answer-check"
            aria-label="错误选项"
            >×</span
          >
        </button>
      </div>

      <div
        v-if="selectedOptionId"
        class="quiz-widget__feedback"
        :style="feedbackStyle"
        role="status"
      >
        <img
          v-if="imageUrl('feedback')"
          class="quiz-widget__feedback-background"
          :src="imageUrl('feedback')"
          :style="imageFit('feedback')"
          alt=""
          draggable="false"
        />
        <div class="quiz-widget__feedback-summary">
          <div
            class="quiz-widget__feedback-result"
            :class="{ 'is-incorrect': !isCurrentAnswerCorrect }"
            :style="fontStyle(option.text.feedback)"
          >
            <img v-if="isCurrentAnswerCorrect" :src="quizAssets.check" alt="" draggable="false" />
            <span v-else class="quiz-widget__incorrect-icon" aria-hidden="true">×</span>
            {{
              isCurrentAnswerCorrect
                ? option.interaction.correctText
                : option.interaction.incorrectText
            }}
          </div>
          <div
            v-if="isCurrentAnswerCorrect || option.interaction.showCorrectOnWrong"
            class="quiz-widget__correct-answer"
          >
            <span>{{ labels.correctAnswer }}</span
            ><strong>{{ correctAnswerText }}</strong>
          </div>
        </div>
        <img
          v-if="currentQuestion.explanation"
          class="quiz-widget__feedback-divider"
          :src="quizAssets.feedbackDivider"
          alt=""
          draggable="false"
        />
      </div>
      <div
        v-if="selectedOptionId && currentQuestion.explanation"
        class="quiz-widget__explanation"
        :style="explanationStyle"
      >
        <img v-if="labels.explanation" :src="quizAssets.book" alt="" draggable="false" />
        <div>
          <strong v-if="labels.explanation">{{ labels.explanation }}</strong>
          <p>{{ currentQuestion.explanation }}</p>
        </div>
      </div>

      <div class="quiz-widget__divider" :style="footerDividerStyle">
        <img :src="quizAssets.divider" alt="" draggable="false" />
      </div>
      <div class="quiz-widget__completed" :style="completedStyle">
        {{ labels.completed }}
        <span class="quiz-widget__counter"
          ><b>{{ completedCount }}</b
          ><span>/{{ displayQuestions.length }}</span></span
        >
        {{ labels.questionSuffix }}
      </div>
      <button
        class="quiz-widget__next"
        :style="buttonStyle"
        type="button"
        :disabled="!isPreview || !selectedOptionId"
        @click.stop.prevent="advance"
      >
        <img
          v-if="imageUrl('nextButton')"
          class="quiz-widget__next-background"
          :src="imageUrl('nextButton')"
          :style="imageFit('nextButton')"
          alt=""
          draggable="false"
        />
        <span class="quiz-widget__text" :style="nextTextStyle">
          {{ isLastQuestion ? option.interaction.finishText : option.interaction.nextText }}
        </span>
        <img
          v-if="!isLastQuestion"
          class="quiz-widget__next-arrow"
          :src="quizAssets.right"
          alt=""
          draggable="false"
        />
      </button>
      <div
        v-if="!isPreview && displayQuestions.length > 0"
        class="quiz-widget__editor-hint"
        role="status"
      >
        {{
          hasRemoteQuizData
            ? '编辑预览：题目按钮仅在场景预览中可答'
            : '示例题：接入题库后将在此显示真实题目'
        }}
      </div>
    </div>

    <!-- 请求进入加载或失败状态时，隐藏基于旧示例题生成的完成页。 -->
    <div v-else-if="finished && displayQuestions.length > 0" class="quiz-widget__complete">
      <div class="quiz-widget__text quiz-widget__score" :style="textStyle(option.text.score)">
        {{ labels.score }} {{ correctCount }} / {{ displayQuestions.length }}
        {{ labels.questionSuffix }}
      </div>
      <button
        class="quiz-widget__next"
        :style="buttonStyle"
        type="button"
        @click.stop.prevent="restart"
      >
        <img
          v-if="imageUrl('nextButton')"
          class="quiz-widget__next-background"
          :src="imageUrl('nextButton')"
          :style="imageFit('nextButton')"
          alt=""
          draggable="false"
        />
        <span class="quiz-widget__text" :style="nextTextStyle">
          {{ option.interaction.restartText }}
        </span>
      </button>
    </div>

    <div v-else class="quiz-widget__empty" role="status">
      <div
        class="quiz-widget__text quiz-widget__empty-message"
        :style="textStyle(option.text.status)"
      >
        {{ emptyMessage }}
      </div>
      <button
        v-if="isPreview && widgetId"
        class="quiz-widget__retry"
        type="button"
        @click.stop.prevent="emit('retry')"
      >
        重新加载题库
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'
import type Config from './config'
import {
  createDefaultQuizProgress,
  createDefaultQuizLabels,
  createQuizOptionSlot,
  createQuizProgressBarOption,
  QUIZ_ASSETS as quizAssets,
} from './quizLayout'
import VProgressBar from '../VProgressBar/index.vue'
import { useImageSource } from '../Image/useImageSource'
import {
  isQuizAnswerCorrect,
  QUIZ_OPTION_INDEX_LABELS,
  QUIZ_PREVIEW_QUESTIONS,
  validateQuizPayload,
  validateQuizQuestions,
} from './quizUtils'
import { getQuizRuntimeStatus, shouldHideQuizQuestions } from './quizRuntimeStatus'
import type { QuizImageConfig, QuizImageKey, QuizOption, QuizQuestion, QuizTextBox } from './type'

defineOptions({ name: 'VQuiz' })

const props = withDefaults(
  defineProps<{ option: Config['option']; widgetId?: string; isPreview?: boolean }>(),
  {
    isPreview: false,
  },
)
const emit = defineEmits<{ retry: []; close: [] }>()

const currentIndex = ref(0)
const selectedOptionId = ref('')
const correctCount = ref(0)
const finished = ref(false)
const closed = ref(false)
const answeredQuestionIds = new Set<string>()

const defaultProgress = createDefaultQuizProgress()
const defaultLabels = createDefaultQuizLabels()
/** 界面文案只跟踪自身字段，接口题库更新或样式输入不会重置已编辑内容。 */
const labels = computed(() => ({ ...defaultLabels, ...props.option.labels }))

/** 复用图片组件的资源编号解析、并发请求合并和卸载清理，七个有效图片位各自独立显示。 */
const imageSources = {
  background: useImageSource(() => props.option.images.background),
  option: useImageSource(() => props.option.images.option),
  optionSelected: useImageSource(() => props.option.images.optionSelected),
  optionCorrect: useImageSource(() => props.option.images.optionCorrect),
  optionIncorrect: useImageSource(() => props.option.images.optionIncorrect),
  feedback: useImageSource(() => props.option.images.feedback),
  nextButton: useImageSource(() => props.option.images.nextButton),
}

const questionsResult = computed(() => validateQuizPayload(props.option))
const hasRemoteQuizData = computed(
  () => Array.isArray(props.option.questions) && props.option.questions.length > 0,
)
const runtimeStatus = computed(() => getQuizRuntimeStatus(props.widgetId || ''))
const displayQuestions = computed<QuizQuestion[]>(() => {
  /** 远程请求未完成或失败时，不展示配置里残留的静态示例题。 */
  if (shouldHideQuizQuestions(props.isPreview, runtimeStatus.value.state)) return []
  if (questionsResult.value.valid) return questionsResult.value.questions
  return props.isPreview ? [] : QUIZ_PREVIEW_QUESTIONS
})
const currentQuestion = computed(() => displayQuestions.value[currentIndex.value])
const isLastQuestion = computed(() => currentIndex.value === displayQuestions.value.length - 1)
/** 当前题只有提交后才计入进度；样式变化不参与计算，重答时自然回到零。 */
const completedCount = computed(() =>
  Math.min(
    displayQuestions.value.length,
    currentIndex.value + Number(Boolean(selectedOptionId.value)),
  ),
)
const progressRatio = computed(() =>
  displayQuestions.value.length ? completedCount.value / displayQuestions.value.length : 0,
)
const progressBarOption = computed(() =>
  createQuizProgressBarOption(
    props.option.progress || defaultProgress,
    progressRatio.value * 100,
    labels.value.progress,
  ),
)
const isCurrentAnswerCorrect = computed(() =>
  Boolean(
    currentQuestion.value &&
      selectedOptionId.value &&
      isQuizAnswerCorrect(currentQuestion.value, selectedOptionId.value),
  ),
)
/** 每次切题只查找一次正确选项，同时生成字母序号与答案，避免模板内反复扫描。 */
const correctAnswerText = computed(() => {
  const question = currentQuestion.value
  if (!question) return ''
  const index = question.options.findIndex((answer) => answer.id === question.correctOptionId)
  return index < 0
    ? ''
    : `${QUIZ_OPTION_INDEX_LABELS[index] || index + 1}. ${question.options[index].text}`
})
const emptyMessage = computed(() => {
  if (runtimeStatus.value.state === 'loading') return '题库加载中…'
  if (runtimeStatus.value.state === 'error') {
    return runtimeStatus.value.message || '题库加载失败，请检查接口后重试。'
  }
  if (
    Array.isArray(props.option.questions) &&
    props.option.questions.length > 0 &&
    !questionsResult.value.valid
  )
    return questionsResult.value.error
  return '暂无题目，请检查题库数据配置。'
})

/** 只在整份题库引用变化且新数据完整有效时重置，不因样式编辑或答题状态更新而清空进度。 */
watch(
  () => props.option.questions,
  (questions) => {
    const result = validateQuizQuestions(questions)
    if (result.valid) resetSession()
  },
)

const rootStyle = computed<CSSProperties>(() => ({
  // 自选背景仍控制完整底板；未配置图片时才显示设计稿的深绿面板与金色边框。
  background: imageUrl('background') ? 'transparent' : '#053836',
  border: imageUrl('background') ? '0' : '1px solid rgba(255, 208, 142, 0.6)',
  borderRadius: imageUrl('background') ? '0' : '8px',
  fontFamily: props.option.text.title.fontFamily || 'inherit',
}))
const columns = computed(() =>
  Math.max(1, Math.min(4, Math.floor(props.option.optionsLayout.columns))),
)
const optionsStyle = computed<CSSProperties>(() => ({
  '--quiz-columns': String(columns.value),
  '--quiz-gap-x': `${props.option.optionsLayout.gapX}px`,
  '--quiz-gap-y': `${props.option.optionsLayout.gapY}px`,
  ...(props.option.optionsLayout.mode === 'auto'
    ? {
        left: `${props.option.text.stem.x}px`,
        top: `${props.option.text.stem.y + props.option.text.stem.height + 20}px`,
        width: `${props.option.text.stem.width}px`,
      }
    : {}),
}))

/** 自动布局按行累计最大高度，单次遍历处理多列及不同按钮高度，额外选项不遮挡解析。 */
const feedbackOffset = computed(() => {
  if (props.option.optionsLayout.mode !== 'auto') return 0
  const answers = currentQuestion.value?.options || []
  let bottom = props.option.text.stem.y + props.option.text.stem.height + 20
  let rowHeight = 0
  for (let index = 0; index < answers.length; index += 1) {
    rowHeight = Math.max(rowHeight, props.option.optionsLayout.slots[index]?.height || 50)
    if ((index + 1) % columns.value === 0 || index === answers.length - 1) {
      bottom += rowHeight + (index < answers.length - 1 ? props.option.optionsLayout.gapY : 0)
      rowHeight = 0
    }
  }
  return Math.max(0, bottom + 24 - props.option.text.feedback.y)
})
const feedbackStyle = computed<CSSProperties>(() => ({
  ...rectStyle(props.option.text.feedback),
  top: `${props.option.text.feedback.y + feedbackOffset.value}px`,
}))
const explanationStyle = computed<CSSProperties>(() => ({
  ...textStyle(props.option.text.explanation),
  top: `${props.option.text.explanation.y + feedbackOffset.value}px`,
}))
const progressStyle = computed<CSSProperties>(() => {
  const progress = props.option.progress || defaultProgress
  return {
    ...textStyle(props.option.text.progress),
    '--quiz-progress-height': `${progress.height}px`,
  }
})
const headerDividerStyle = computed<CSSProperties>(() => ({
  left: `${props.option.text.title.x}px`,
  top: `${props.option.text.title.y + props.option.text.title.height + 8}px`,
  width: `${props.option.text.progress.width}px`,
}))
const closeStyle = computed<CSSProperties>(() => ({
  left: `${props.option.text.progress.x + props.option.text.progress.width - 32}px`,
  top: `${props.option.text.title.y}px`,
}))
const buttonStyle = computed<CSSProperties>(() => ({
  left: `${props.option.button.x}px`,
  top: `${props.option.button.y + (finished.value ? 0 : feedbackOffset.value)}px`,
  width: `${props.option.button.width}px`,
  height: `${props.option.button.height}px`,
}))
const footerDividerStyle = computed<CSSProperties>(() => ({
  left: `${props.option.text.progress.x}px`,
  top: `${props.option.button.y + feedbackOffset.value - 12}px`,
  width: `${props.option.text.progress.width}px`,
}))
const completedStyle = computed<CSSProperties>(() => ({
  left: `${props.option.text.progress.x}px`,
  top: `${props.option.button.y + feedbackOffset.value}px`,
  height: `${props.option.button.height}px`,
  color: props.option.text.progress.color,
  fontFamily: props.option.text.progress.fontFamily || 'inherit',
}))
/** 选项内容保留配置宽度上限，并为末端判题图标预留空间，避免多列时覆盖相邻按钮。 */
const answerTextStyle = computed<CSSProperties>(() => ({
  ...textStyle(props.option.text.optionText),
  width: `min(${props.option.text.optionText.width}px, calc(100% - ${props.option.text.optionText.x + 48}px))`,
}))
const nextTextStyle = computed<CSSProperties>(() => {
  const box = props.option.text.nextButton
  const width = Math.max(box.width, props.option.button.width - box.x * 2)
  return {
    ...textStyle(box),
    ...(finished.value || isLastQuestion.value ? { width: `${width}px` } : {}),
  }
})

/** 排版与坐标分别复用，反馈行可继承文字样式而不再次套用全局绝对坐标。 */
const fontStyle = (box: QuizTextBox): CSSProperties => ({
  color: box.color,
  fontSize: `${box.fontSize}px`,
  fontFamily: box.fontFamily || 'inherit',
  fontWeight: box.fontWeight,
  lineHeight: String(box.lineHeight),
  textAlign: box.textAlign,
  padding: `${box.paddingY}px ${box.paddingX}px`,
})
const textStyle = (box: QuizTextBox): CSSProperties => ({
  ...rectStyle(box),
  ...fontStyle(box),
  justifyContent:
    box.textAlign === 'left' ? 'flex-start' : box.textAlign === 'right' ? 'flex-end' : 'center',
})

const rectStyle = (rect: {
  x: number
  y: number
  width: number
  height: number
}): CSSProperties => ({
  left: `${rect.x}px`,
  top: `${rect.y}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
})

const getImageConfig = (name: QuizImageKey): QuizImageConfig =>
  props.option.images[name] || {
    sourceType: 'external',
    value: '',
    resourceKey: '',
    fit: 'contain',
  }
const imageUrl = (name: keyof typeof imageSources) => imageSources[name].value
const imageFit = (name: QuizImageKey): CSSProperties => ({ objectFit: getImageConfig(name).fit })

const answerImage = (optionId: string) => {
  if (!selectedOptionId.value) return imageUrl('option')
  if (optionId === currentQuestion.value?.correctOptionId)
    return imageUrl('optionCorrect') || imageUrl('optionSelected') || imageUrl('option')
  if (optionId === selectedOptionId.value)
    return imageUrl('optionIncorrect') || imageUrl('optionSelected') || imageUrl('option')
  return imageUrl('option')
}

const answerImageFit = (optionId: string): CSSProperties => {
  const imageName = !selectedOptionId.value
    ? 'option'
    : optionId === currentQuestion.value?.correctOptionId
      ? 'optionCorrect'
      : optionId === selectedOptionId.value
        ? 'optionIncorrect'
        : 'option'
  return imageFit(imageName)
}

const answerStyle = (answerIndex: number): CSSProperties => {
  const rect =
    props.option.optionsLayout.slots[answerIndex] ||
    createQuizOptionSlot(answerIndex, props.option.optionsLayout.columns)
  return props.option.optionsLayout.mode === 'custom'
    ? { ...rectStyle(rect), position: 'absolute' }
    : { gridColumn: `span 1`, minHeight: `${rect.height}px` }
}

const answerClass = (optionId: string) => ({
  'is-selected': selectedOptionId.value === optionId,
  'is-correct': Boolean(
    selectedOptionId.value && optionId === currentQuestion.value?.correctOptionId,
  ),
  'is-incorrect': Boolean(
    selectedOptionId.value &&
      optionId === selectedOptionId.value &&
      optionId !== currentQuestion.value?.correctOptionId,
  ),
})

/** 判题只按已校验的稳定选项编号比较，并用当前选择门禁避免重复累计分数。 */
const submitAnswer = (optionId: string) => {
  if (!props.isPreview || selectedOptionId.value || !currentQuestion.value) return
  selectedOptionId.value = optionId
  if (answeredQuestionIds.has(currentQuestion.value.id)) return
  answeredQuestionIds.add(currentQuestion.value.id)
  if (isQuizAnswerCorrect(currentQuestion.value, optionId)) correctCount.value += 1
}

const advance = () => {
  if (!props.isPreview || !selectedOptionId.value) return
  if (isLastQuestion.value) {
    finished.value = true
    return
  }
  currentIndex.value += 1
  selectedOptionId.value = ''
}

/** 重开仅重置当前组件实例的内存答题状态，保留已获取题库且不触发网络请求。 */
const resetSession = () => {
  currentIndex.value = 0
  selectedOptionId.value = ''
  correctCount.value = 0
  finished.value = false
  closed.value = false
  answeredQuestionIds.clear()
}

const restart = () => resetSession()

/** 关闭只影响本次预览实例，不修改场景可见性配置，也不触发题库请求。 */
const close = () => {
  if (!props.isPreview) return
  closed.value = true
  emit('close')
}
watch(
  () => props.isPreview,
  () => {
    closed.value = false
  },
)
</script>

<!-- 样式独立维护，避免入口组件超过项目规定的行数上限。 -->
<style scoped lang="scss" src="./quiz.scss"></style>
