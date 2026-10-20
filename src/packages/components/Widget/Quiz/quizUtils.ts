import type { QuizQuestion } from './type'

export interface QuizValidationResult {
  valid: boolean
  questions: QuizQuestion[]
  error: string
}

/** 题库整体校验结果始终包含问题列表，调用方不必为非法响应添加空值分支。 */
export interface QuizPayloadValidationResult extends QuizValidationResult {
  title: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

/** 接口返回先完整校验，再整体替换题库，避免无效题目进入判题流程。 */
export const validateQuizQuestions = (value: unknown): QuizValidationResult => {
  if (!Array.isArray(value))
    return { valid: false, questions: [], error: '题库格式错误，缺少题目列表。' }
  if (value.length === 0) return { valid: false, questions: [], error: '本次测验暂无题目。' }

  const questionIds = new Set<string>()
  const questions: QuizQuestion[] = []
  for (let questionIndex = 0; questionIndex < value.length; questionIndex += 1) {
    const record = value[questionIndex]
    const displayIndex = questionIndex + 1
    if (!isRecord(record))
      return { valid: false, questions: [], error: `第 ${displayIndex} 题格式错误。` }
    const id = typeof record.id === 'string' ? record.id.trim() : ''
    const stem = typeof record.stem === 'string' ? record.stem.trim() : ''
    if (!id || questionIds.has(id)) {
      return { valid: false, questions: [], error: `第 ${displayIndex} 题编号缺失或重复。` }
    }
    questionIds.add(id)
    if (record.type !== 'single') {
      return { valid: false, questions: [], error: `第 ${displayIndex} 题类型暂不支持。` }
    }
    if (!stem) return { valid: false, questions: [], error: `第 ${displayIndex} 题缺少题干。` }
    if (!Array.isArray(record.options) || record.options.length < 2) {
      return { valid: false, questions: [], error: `第 ${displayIndex} 题至少需要两个选项。` }
    }
    const optionIds = new Set<string>()
    const options = record.options.map((rawOption, optionIndex) => {
      if (!isRecord(rawOption)) return null
      const optionId = typeof rawOption.id === 'string' ? rawOption.id.trim() : ''
      const text = typeof rawOption.text === 'string' ? rawOption.text.trim() : ''
      if (!optionId || optionIds.has(optionId) || !text) return null
      optionIds.add(optionId)
      return { id: optionId, text, displayIndex: optionIndex }
    })
    if (options.some((option) => option === null)) {
      return { valid: false, questions: [], error: `第 ${displayIndex} 题存在空白或重复选项。` }
    }
    const correctOptionId =
      typeof record.correctOptionId === 'string' ? record.correctOptionId.trim() : ''
    if (!correctOptionId || !optionIds.has(correctOptionId)) {
      return {
        valid: false,
        questions: [],
        error: `第 ${displayIndex} 题的正确答案不属于当前选项。`,
      }
    }
    const validOptions = options.flatMap((option) => (option ? [option] : []))
    questions.push({
      id,
      type: 'single',
      stem,
      options: validOptions.map(({ id: optionId, text }) => ({ id: optionId, text })),
      correctOptionId,
      explanation: typeof record.explanation === 'string' ? record.explanation : '',
    })
  }
  return { valid: true, questions, error: '' }
}

/** 校验测验包络和可选总数，避免题号显示与接口实际题库长度不一致。 */
export const validateQuizPayload = (value: unknown): QuizPayloadValidationResult => {
  if (!isRecord(value)) {
    return {
      valid: false,
      questions: [] as QuizQuestion[],
      error: '测验接口未返回有效数据。',
      title: '',
    }
  }
  const normalized = validateQuizQuestions(value.questions)
  if (!normalized.valid) return { ...normalized, title: '' }
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const quizId = typeof value.quizId === 'string' ? value.quizId.trim() : ''
  if (!quizId) {
    return { valid: false, questions: [], error: '测验编号为空。', title: '' }
  }
  if (
    value.total !== undefined &&
    (typeof value.total !== 'number' ||
      !Number.isInteger(value.total) ||
      value.total < 0 ||
      value.total !== normalized.questions.length)
  ) {
    return {
      valid: false,
      questions: [],
      error: '接口返回的题目总数与题目列表不一致。',
      title: '',
    }
  }
  return { ...normalized, title }
}

/** 独立的纯函数判题入口；以稳定选项编号比较，不受文案和显示顺序影响。 */
export const isQuizAnswerCorrect = (question: QuizQuestion, optionId: string) =>
  question.correctOptionId === optionId

/** 编辑示例沿用已确认的真实接口字段；选项编号与显示字母分离，判题只比较编号。 */
export const QUIZ_PREVIEW_QUESTIONS: QuizQuestion[] = [
  {
    id: 'science-huangqi-root',
    type: 'single',
    stem: '黄芪主要是哪一部分入药？',
    options: [
      { id: 'A', text: '根' },
      { id: 'B', text: '花' },
      { id: 'C', text: '果实' },
    ],
    correctOptionId: 'A',
    explanation: '黄芪以干燥根入药，是常用的补气药材。',
  },
]

/** 数据面板首次打开时展示真实接口的单行结构，空标题由独立的界面文案配置兜底。 */
export const QUIZ_PREVIEW_PAYLOAD = {
  quizId: 'science-showroom-qa',
  title: '',
  total: QUIZ_PREVIEW_QUESTIONS.length,
  questions: QUIZ_PREVIEW_QUESTIONS,
}

/** 按选项展示顺序生成英文字母序号；判题仍以稳定选项编号为准。 */
export const QUIZ_OPTION_INDEX_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
