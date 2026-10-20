import { describe, expect, it } from 'vitest'
import { shouldHideQuizQuestions } from '../quizRuntimeStatus'

describe('答题测验运行状态展示', () => {
  it('预览中加载或失败时隐藏配置中残留的静态示例题', () => {
    // 验证预览请求状态、成功状态和编辑态分别采用正确的题目展示规则。
    expect(shouldHideQuizQuestions(true, 'loading')).toBe(true)
    expect(shouldHideQuizQuestions(true, 'error')).toBe(true)
    expect(shouldHideQuizQuestions(true, 'ready')).toBe(false)
    expect(shouldHideQuizQuestions(true, 'idle')).toBe(false)
    expect(shouldHideQuizQuestions(false, 'error')).toBe(false)
  })
})
