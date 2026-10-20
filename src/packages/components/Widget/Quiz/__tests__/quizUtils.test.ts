import { describe, expect, it } from 'vitest'
import {
  isQuizAnswerCorrect,
  QUIZ_OPTION_INDEX_LABELS,
  validateQuizPayload,
  validateQuizQuestions,
} from '../quizUtils'
import type { QuizQuestion } from '../type'

const validQuestion: QuizQuestion = {
  id: 'question-1',
  type: 'single',
  stem: '黄芪主要是哪一部分入药？',
  options: [
    { id: 'root', text: '根' },
    { id: 'flower', text: '花' },
  ],
  correctOptionId: 'root',
  explanation: '黄芪主要以根入药。',
}

describe('答题测验题库校验与判题', () => {
  it('按显示顺序使用 A、B、C、D 作为前四个选项序号', () => {
    // 选项文本可以独立变化，序号只由当前展示顺序生成。
    expect(QUIZ_OPTION_INDEX_LABELS.slice(0, 4)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('保留完整嵌套题库，并按稳定选项编号判题', () => {
    const result = validateQuizPayload({
      quizId: 'quiz-1',
      title: '本草小测验',
      total: 1,
      questions: [validQuestion],
    })

    expect(result).toMatchObject({ valid: true, title: '本草小测验', questions: [validQuestion] })
    expect(isQuizAnswerCorrect(result.questions[0], 'root')).toBe(true)
    expect(isQuizAnswerCorrect(result.questions[0], 'flower')).toBe(false)
  })

  it.each([
    ['重复题目编号', [{ ...validQuestion }, { ...validQuestion }], '编号缺失或重复'],
    [
      '重复选项编号',
      [
        {
          ...validQuestion,
          options: [
            { id: 'same', text: '甲' },
            { id: 'same', text: '乙' },
          ],
        },
      ],
      '空白或重复选项',
    ],
    [
      '不存在的答案编号',
      [{ ...validQuestion, correctOptionId: 'missing' }],
      '正确答案不属于当前选项',
    ],
  ])('拒绝%s且返回完整结果结构', (_name, questions, message) => {
    const result = validateQuizQuestions(questions)

    expect(result.valid).toBe(false)
    expect(result.questions).toEqual([])
    expect(result.error).toContain(message)
  })

  it('拒绝非法总数并保持问题列表字段存在', () => {
    const result = validateQuizPayload({
      quizId: 'quiz-1',
      total: '1',
      questions: [validQuestion],
    })

    expect(result).toMatchObject({
      valid: false,
      questions: [],
      error: '接口返回的题目总数与题目列表不一致。',
    })
  })

  it('拒绝没有稳定测验编号或没有明确题型的题库', () => {
    const missingQuizId = validateQuizPayload({ questions: [validQuestion] })
    const missingQuestionType = validateQuizQuestions([{ ...validQuestion, type: undefined }])

    expect(missingQuizId.error).toBe('测验编号为空。')
    expect(missingQuestionType.error).toContain('类型暂不支持')
  })
})
