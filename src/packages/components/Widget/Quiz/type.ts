export type QuizImageSource = 'external' | 'resource-market'

/** 测验仅支持背景、选项状态、判题提示框和下一题按钮图片。 */
export const QUIZ_IMAGE_KEYS = [
  'background',
  'option',
  'optionSelected',
  'optionCorrect',
  'optionIncorrect',
  'feedback',
  'nextButton',
] as const

export type QuizImageKey = (typeof QUIZ_IMAGE_KEYS)[number]

export interface QuizImageConfig {
  /** 市场图片只持久化稳定编号，运行时地址由场景资源系统解析。 */
  sourceType: QuizImageSource
  value: string
  resourceKey: string
  fit: 'cover' | 'contain' | 'fill'
}

export interface QuizTextBox {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  lineHeight: number
  textAlign: 'left' | 'center' | 'right'
  paddingX: number
  paddingY: number
}

export interface QuizOptionItem {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  type: 'single'
  stem: string
  options: QuizOptionItem[]
  correctOptionId: string
  explanation: string
}

export interface QuizLayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/** 进度条单独保存外观；实际进度只由当前实例的作答状态计算，不写入场景。 */
export interface QuizProgressStyle {
  color: string
  trackColor: string
  height: number
}

/** 接口不提供的界面文案独立持久化，题库映射不能覆盖用户配置的标题和提示。 */
export interface QuizLabels {
  title: string
  progress: string
  questionPrefix: string
  questionSuffix: string
  completed: string
  correctAnswer: string
  explanation: string
  score: string
}

export interface QuizOption {
  label: string
  title: string
  quizId: string
  total?: number
  questions: QuizQuestion[]
  images: Record<QuizImageKey, QuizImageConfig>
  text: {
    title: QuizTextBox
    progress: QuizTextBox
    stem: QuizTextBox
    optionIndex: QuizTextBox
    optionText: QuizTextBox
    feedback: QuizTextBox
    explanation: QuizTextBox
    nextButton: QuizTextBox
    score: QuizTextBox
    status: QuizTextBox
  }
  /** 旧配置未设置时沿用设计稿默认值，不要求迁移已有场景数据。 */
  progress?: QuizProgressStyle
  /** 缺少此字段的已有配置使用设计稿文案；空字符串表示用户主动隐藏对应文案。 */
  labels?: QuizLabels
  button: QuizLayoutRect
  optionsLayout: {
    mode: 'auto' | 'custom'
    columns: number
    gapX: number
    gapY: number
    slots: QuizLayoutRect[]
  }
  interaction: {
    correctText: string
    incorrectText: string
    nextText: string
    finishText: string
    restartText: string
    showCorrectOnWrong: boolean
  }
}
