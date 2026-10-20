import type { QuizLabels, QuizLayoutRect, QuizOption, QuizProgressStyle, QuizTextBox } from './type'
import type { VProgressBarOption } from '../VProgressBar/config'

/** 对应设计节点 352:2494 的逻辑尺寸；复用项目已注册的思源宋体，不重复加载字体。 */
export const QUIZ_DEFAULT_SIZE = { width: 720, height: 630 } as const
const QUIZ_FONT_FAMILY = '"Source Han Serif SC", "Songti SC", SimSun, serif'

/** 设计素材地址在模块加载时创建一次，多测验实例共享，不重复解析本地资源路径。 */
export const QUIZ_ASSETS = {
  close: new URL('./assets/close.svg', import.meta.url).href,
  divider: new URL('./assets/divider.svg', import.meta.url).href,
  check: new URL('./assets/check.svg', import.meta.url).href,
  feedbackDivider: new URL('./assets/feedback-divider.svg', import.meta.url).href,
  book: new URL('./assets/book.svg', import.meta.url).href,
  right: new URL('./assets/right.svg', import.meta.url).href,
}

/** 所有文本框使用舞台逻辑像素，颜色、字体及留白统一以新版设计稿为默认值。 */
export const createQuizTextBox = (
  layout: QuizLayoutRect,
  overrides: Partial<QuizTextBox> = {},
): QuizTextBox => ({
  ...layout,
  fontSize: 20,
  color: '#fff4e0',
  fontFamily: QUIZ_FONT_FAMILY,
  fontWeight: 'normal',
  lineHeight: 1.4,
  textAlign: 'center',
  paddingX: 0,
  paddingY: 0,
  ...overrides,
})

/** 默认单列长条选项；自定义模式按列数生成独立槽位，额外选项按需创建。 */
export const createQuizOptionSlot = (index: number, columns = 1): QuizLayoutRect => {
  const safeColumns = Math.max(1, Math.min(4, Math.floor(columns)))
  const column = index % safeColumns
  const row = Math.floor(index / safeColumns)
  const width = (680 - (safeColumns - 1) * 12) / safeColumns
  const gapX = 12
  const gapY = 16
  const startX = 20
  const startY = 193

  return {
    x: startX + column * (width + gapX),
    y: startY + row * (50 + gapY),
    width,
    height: 50,
  }
}

/** 新建和恢复默认共用同一份工厂，避免按钮、进度条与选项配置出现两套默认值。 */
export const createDefaultQuizButton = (): QuizLayoutRect => ({
  x: 608,
  y: 578,
  width: 92,
  height: 32,
})

/** 金色填充、半透明轨道及四像素条高分别可编辑，每个组件持有独立对象。 */
export const createDefaultQuizProgress = (): QuizProgressStyle => ({
  color: '#ffd08e',
  trackColor: 'rgba(255, 255, 255, 0.1)',
  height: 4,
})

/** 只配置界面文案，不混入接口题干、选项或解释正文；恢复布局时保留用户编辑的文案。 */
export const createDefaultQuizLabels = (): QuizLabels => ({
  title: '本草问答',
  progress: '答题进度',
  questionPrefix: '第',
  questionSuffix: '题',
  completed: '已完成',
  correctAnswer: '正确答案：',
  explanation: '本草知识解析',
  score: '测验完成：答对',
})

/** 复用现有直线进度条的比例钳制与样式实现，隐藏其百分比文字，由测验展示实际题数。 */
export const createQuizProgressBarOption = (
  progress: QuizProgressStyle,
  percentage: number,
  label = '答题进度',
): VProgressBarOption => ({
  percentage,
  fillColor: progress.color,
  trackColor: progress.trackColor,
  trackHeight: progress.height,
  borderRadius: 11,
  showPercentage: false,
  textPosition: 'right',
  textColor: '#fff4e0',
  textSize: 14,
  label: label || '答题进度',
})

/** 单列长条是新版默认排版；槽位保留独立尺寸，切换自定义位置后仍可继续编辑。 */
export const createDefaultQuizOptionsLayout = (): QuizOption['optionsLayout'] => ({
  mode: 'auto',
  columns: 1,
  gapX: 12,
  gapY: 16,
  slots: Array.from({ length: 3 }, (_, index) => createQuizOptionSlot(index)),
})

/** 仅在配置缺失或用户恢复默认时使用，不在每次渲染中重建布局。 */
export const createDefaultQuizTextBoxes = () => ({
  // 标题、进度和题干独立定位；进度框同时容纳说明、题号与底部横条。
  title: createQuizTextBox(
    { x: 20, y: 20, width: 620, height: 32 },
    { fontSize: 20, color: '#ffd08e', fontWeight: 'bold', textAlign: 'left' },
  ),
  progress: createQuizTextBox(
    { x: 20, y: 72, width: 680, height: 32 },
    { fontSize: 14, color: '#e5dfd3', textAlign: 'left' },
  ),
  stem: createQuizTextBox(
    { x: 20, y: 138, width: 680, height: 35 },
    { fontSize: 24, color: '#ffd08e', fontWeight: 'bold' },
  ),
  optionIndex: createQuizTextBox({ x: 8, y: 8, width: 32, height: 32 }, { fontSize: 20 }),
  optionText: createQuizTextBox(
    { x: 48, y: 8, width: 580, height: 32 },
    { fontSize: 20, textAlign: 'left' },
  ),
  // 反馈框负责底板与结果行，解析文字独立定位，继续支持用户按背景留白分别微调。
  feedback: createQuizTextBox(
    { x: 20, y: 399, width: 680, height: 152 },
    { fontSize: 20, color: '#7cb8a9', fontWeight: 'bold', textAlign: 'left' },
  ),
  explanation: createQuizTextBox(
    { x: 36, y: 486, width: 648, height: 48 },
    { fontSize: 14, textAlign: 'left' },
  ),
  nextButton: createQuizTextBox(
    { x: 12, y: 4, width: 48, height: 24 },
    { fontSize: 16, color: '#053836' },
  ),
  score: createQuizTextBox(
    { x: 20, y: 260, width: 680, height: 70 },
    { fontSize: 24, color: '#ffd08e', fontWeight: 'bold' },
  ),
  status: createQuizTextBox(
    { x: 40, y: 240, width: 640, height: 96 },
    { fontSize: 18, color: '#e5dfd3' },
  ),
})

/** 属性输入只允许有限的正数尺寸；负位置可用于贴合边缘的装饰设计。 */
export const normalizeQuizLayoutRect = (
  value: unknown,
  fallback: QuizLayoutRect,
): QuizLayoutRect => {
  if (!value || typeof value !== 'object') return { ...fallback }
  const candidate = value as Partial<QuizLayoutRect>
  return {
    x: Number.isFinite(candidate.x) ? Number(candidate.x) : fallback.x,
    y: Number.isFinite(candidate.y) ? Number(candidate.y) : fallback.y,
    width:
      Number.isFinite(candidate.width) && Number(candidate.width) > 0
        ? Number(candidate.width)
        : fallback.width,
    height:
      Number.isFinite(candidate.height) && Number(candidate.height) > 0
        ? Number(candidate.height)
        : fallback.height,
  }
}
