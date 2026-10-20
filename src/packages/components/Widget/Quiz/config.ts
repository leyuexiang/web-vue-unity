import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createDefaultQuizButton,
  createDefaultQuizLabels,
  createDefaultQuizOptionsLayout,
  createDefaultQuizProgress,
  createDefaultQuizTextBoxes,
  QUIZ_DEFAULT_SIZE,
} from './quizLayout'
import type { QuizImageConfig, QuizImageKey, QuizOption } from './type'

export const VQuizInfo = {
  name: '答题测验',
  keyName: 'VQuiz',
  packageName: 'Widget',
  icon: new URL('../assets/images/quiz.svg', import.meta.url).href,
}

const createImageConfig = (): QuizImageConfig => ({
  sourceType: 'external',
  value: '',
  resourceKey: '',
  fit: 'contain',
})

/** 七个有效图片位各自保存资源信息，标题装饰由整体背景承载。 */
export const createQuizImageConfigs = (): Record<QuizImageKey, QuizImageConfig> => ({
  background: createImageConfig(),
  option: createImageConfig(),
  optionSelected: createImageConfig(),
  optionCorrect: createImageConfig(),
  optionIncorrect: createImageConfig(),
  feedback: createImageConfig(),
  nextButton: createImageConfig(),
})

export default class Config extends BaseConfig {
  /** 新拖入画布的组件直接采用设计稿尺寸，后续缩放仍由现有二维组件容器处理。 */
  public attr = { l: 0, t: 0, w: QUIZ_DEFAULT_SIZE.width, h: QUIZ_DEFAULT_SIZE.height, zIndex: -1 }
  public info = clone(VQuizInfo)
  public option: QuizOption = {
    label: '答题测验',
    // 接口标题单独映射；为空时使用界面文案中的默认标题，避免丢失用户配置。
    title: '',
    quizId: '',
    questions: [],
    images: createQuizImageConfigs(),
    text: createDefaultQuizTextBoxes(),
    progress: createDefaultQuizProgress(),
    labels: createDefaultQuizLabels(),
    button: createDefaultQuizButton(),
    optionsLayout: createDefaultQuizOptionsLayout(),
    interaction: {
      // 状态图标独立显示，提示文案不再重复拼接符号。
      correctText: '回答正确！',
      incorrectText: '回答错误！',
      nextText: '下一题',
      finishText: '完成测验',
      restartText: '重新答题',
      showCorrectOnWrong: true,
    },
  }
}
