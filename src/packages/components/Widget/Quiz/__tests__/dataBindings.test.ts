import { describe, expect, it } from 'vitest'
import QuizConfig from '../config'
import { applyWidgetBindings } from '@/utils/dataConfig/dataConfigRuntimeBindings'
import { inferWidgetDataConfigFromOption } from '@/utils/dataConfig/widgetDataInference'
import { normalizePreviewRemoteRows } from '@/utils/renderScene/scenePreviewRemoteHelpers'
import { isQuizAnswerCorrect, validateQuizPayload } from '../quizUtils'
import type { ComponentDataBindingRule } from '@/types/data-config'

const questions = [
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

const bindings: ComponentDataBindingRule[] = [
  { kind: 'widget', sourceField: 'quizId', targetPath: 'quizId' },
  { kind: 'widget', sourceField: 'title', targetPath: 'title' },
  { kind: 'widget', sourceField: 'total', targetPath: 'total' },
  { kind: 'widget', sourceField: 'questions', targetPath: 'questions' },
]

describe('答题测验数据映射', () => {
  it('新测验在数据面板推导出包含完整单选题结构的静态示例', () => {
    // 用题库为空的新组件模拟用户首次打开数据面板时的默认推导。
    const component = new QuizConfig()
    const config = inferWidgetDataConfigFromOption(
      component.info.packageName,
      component.info.keyName,
      component.option as unknown as Record<string, unknown>,
    )

    expect(config?.request.type).toBe('static')
    expect(config?.request.config).toMatchObject({
      data: [
        {
          quizId: 'science-showroom-qa',
          // 接口允许空标题；默认界面标题独立保存，不伪造接口返回值。
          title: '',
          total: 1,
          questions: [
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
          ],
        },
      ],
    })
    expect(config?.bindings.map((binding) => binding.targetPath)).toEqual([
      'quizId',
      'title',
      'total',
      'questions',
    ])
  })

  it('真实数组题库保留嵌套选项，空标题不覆盖独立界面文案', () => {
    const component = new QuizConfig()
    // 复用正式数组响应归一化入口，同时验证自定义解析标题不会被题库映射清空。
    component.option.labels!.explanation = '财报知识解析'
    const response = [{ quizId: 'science-showroom-qa', title: '', total: 1, questions }]
    const normalized = normalizePreviewRemoteRows(response)
    const row = normalized.source[0]

    applyWidgetBindings(component, bindings, row, normalized.source)

    expect(component.option).toMatchObject(row)
    expect(component.option.questions[0]?.options).toEqual(questions[0]?.options)
    expect(component.option.questions[0]?.correctOptionId).toBe('A')
    expect(component.option.labels).toMatchObject({
      title: '本草问答',
      explanation: '财报知识解析',
    })
    expect(validateQuizPayload(component.option).valid).toBe(true)
    expect(isQuizAnswerCorrect(component.option.questions[0], 'A')).toBe(true)
    expect(isQuizAnswerCorrect(component.option.questions[0], 'B')).toBe(false)
  })

  it('默认静态数据推导保留单行测验包络与题目数组', () => {
    const config = inferWidgetDataConfigFromOption('Widget', 'VQuiz', {
      quizId: 'quiz-1',
      title: '本草小测验',
      total: 1,
      questions,
    } as Record<string, unknown>)

    expect(config?.dataset.source).toEqual([
      { quizId: 'quiz-1', title: '本草小测验', total: 1, questions },
    ])
    expect(config?.bindings.map((binding) => binding.targetPath)).toEqual([
      'quizId',
      'title',
      'total',
      'questions',
    ])
  })
})
