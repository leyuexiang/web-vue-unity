import type {
  BillboardAppearance,
  BillboardConfig,
  BillboardContentBlock,
  BillboardImageFit,
  BillboardTextRun,
} from './types'

/** 单个看板最多保留的结构块数量，避免异常场景数据把画布排版放大为长任务。 */
export const BILLBOARD_MAX_BLOCK_COUNT = 12
/** 每个结构块最多保留的文本片段数量，保证绘制器的遍历上限稳定。 */
export const BILLBOARD_MAX_RUN_COUNT = 24
/** 单个文本片段最大字符数，限制画布测量和换行的单次工作量。 */
export const BILLBOARD_MAX_TEXT_LENGTH = 600
/** 单个结构块的总字符数上限，避免多个片段叠加后绕过单片段限制。 */
export const BILLBOARD_MAX_BLOCK_TEXT_LENGTH = 1200
/** 看板画布的最大逻辑边长；后续 Runtime 以此上限避免创建异常大的 CanvasTexture。 */
export const BILLBOARD_MAX_SIZE = 2048
/**
 * 看板画布的最小逻辑边长。
 *
 * 尺寸是创作属性而非模板约束，因此允许 1px 起的任意正整数；例如状态角标、点位提示等场景
 * 需要 60x20 这样的小尺寸。Canvas 在 1px 时仍可安全创建，最大尺寸限制继续由
 * BILLBOARD_MAX_SIZE 保护，避免异常配置耗尽纹理内存。
 */
export const BILLBOARD_MIN_SIZE = 1
/** 图片块单边最大尺寸；与画布最大边长一致，防止图片布局越过可见画布。 */
export const BILLBOARD_MAX_IMAGE_SIZE = BILLBOARD_MAX_SIZE
/** 内容块位置偏移的最大绝对值；允许在画布外少量定位，但阻止异常坐标扩大布局计算范围。 */
export const BILLBOARD_CONTENT_POSITION_RANGE = {
  min: -BILLBOARD_MAX_SIZE,
  max: BILLBOARD_MAX_SIZE,
} as const
/** 看板距离字段的统一范围，运行时和属性面板共享该边界，避免双端产生不同语义。 */
export const BILLBOARD_DISTANCE_RANGE = { min: 0, max: 1_000_000 } as const
/** 看板距离缩放系数范围，限制异常输入导致精灵突然放大或缩小到不可编辑。 */
export const BILLBOARD_DISTANCE_SCALE_RANGE = { min: 0.1, max: 4 } as const
/** 图片自发光强度范围；Canvas 2D 使用 0～1 屏幕混合，避免 HDR 数值造成整块过曝。 */
export const BILLBOARD_IMAGE_EMISSIVE_RANGE = { min: 0, max: 1 } as const
/** 图片自发光默认颜色；白色只提升原图亮度，不额外改变色相。 */
export const BILLBOARD_DEFAULT_IMAGE_EMISSIVE_COLOR = '#FFFFFF'
/** 默认从零距离开始应用近距缩放。 */
export const BILLBOARD_DEFAULT_NEAR_DISTANCE = 0
/** 新建或缺失尺寸时的默认画布宽度，采用紧凑正方形便于场景内首次定位。 */
export const BILLBOARD_DEFAULT_WIDTH = 60
/** 新建或缺失尺寸时的默认画布高度，与默认宽度保持 1:1。 */
export const BILLBOARD_DEFAULT_HEIGHT = 60
/** 120×150 图片基准下标题的默认字号，避免旧版 28px 在窄图标上换行过度。 */
export const BILLBOARD_DEFAULT_TITLE_FONT_SIZE = 18
/** 120×150 图片基准下段落的默认字号，段落默认隐藏，显示时仍保持紧凑信息密度。 */
export const BILLBOARD_DEFAULT_PARAGRAPH_FONT_SIZE = 12
/** 新建看板内置图标图片的默认逻辑宽度，按用户当前图片资源尺寸设置。 */
export const BILLBOARD_DEFAULT_ICON_WIDTH = 120
/** 新建看板内置图标图片的默认逻辑高度，按用户当前图片资源尺寸设置。 */
export const BILLBOARD_DEFAULT_ICON_HEIGHT = 150
/** 点击属性面板“添加图片”时使用的默认图片宽度，保证新增图片无需手动输入即可正常显示。 */
export const BILLBOARD_ADDED_IMAGE_DEFAULT_WIDTH = 100
/** 点击属性面板“添加图片”时使用的默认图片高度，与默认宽度组成 100×100 正方形。 */
export const BILLBOARD_ADDED_IMAGE_DEFAULT_HEIGHT = 100
/** 默认在 10 公里处完成远距缩放过渡。 */
export const BILLBOARD_DEFAULT_FAR_DISTANCE = 10_000
/** 默认近距保持面板的基础世界尺寸。 */
export const BILLBOARD_DEFAULT_NEAR_SCALE = 1
/** 默认远距缩放为近距的一半，同时保留 Three/Cesium 的透视近大远小。 */
export const BILLBOARD_DEFAULT_FAR_SCALE = 0.5
/** 默认超过 10 公里后停止渲染，避免远景继续占用提交和纹理采样预算。 */
export const BILLBOARD_DEFAULT_MAXIMUM_DISPLAY_DISTANCE = 10_000
/** 文本字间距允许范围；限制过大正负值造成逐字布局异常或重叠。 */
export const BILLBOARD_LETTER_SPACING_RANGE = { min: -2, max: 24 } as const
/** 标题和段落文本区域宽度范围；0 表示自动使用看板内容区宽度。 */
export const BILLBOARD_TEXT_WIDTH_RANGE = { min: 0, max: BILLBOARD_MAX_SIZE } as const

const DEFAULT_TITLE_TEXT = '三维看板'
const DEFAULT_PARAGRAPH_TEXT = '请在右侧属性面板编辑内容'
const DEFAULT_PADDING: [number, number, number, number] = [24, 24, 24, 24]

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const clampNumber = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(Math.max(value, minimum), maximum)
}

/**
 * 归一化内容块的画布像素偏移。
 *
 * 位置只影响当前块的绘制起点，不参与其他块的自动流式排版；缺失或非法值回到零，保证旧
 * 场景继续保持原有布局。统一限制范围，避免极端坐标让绘制器创建无意义的超大裁剪区域。
 */
const normalizeContentPosition = (value: unknown): [number, number] => {
  if (!Array.isArray(value) || value.length !== 2) return [0, 0]
  return [
    clampNumber(
      value[0],
      0,
      BILLBOARD_CONTENT_POSITION_RANGE.min,
      BILLBOARD_CONTENT_POSITION_RANGE.max,
    ),
    clampNumber(
      value[1],
      0,
      BILLBOARD_CONTENT_POSITION_RANGE.min,
      BILLBOARD_CONTENT_POSITION_RANGE.max,
    ),
  ]
}

/**
 * 归一化十六进制颜色。
 *
 * 看板配置只允许纯颜色值，不能接受 `rgb()`、CSS 变量或任意样式字符串；这样画布绘制层无需
 * 重复解析业务输入，也避免未来错误地把网页样式协议带入 WebGL 场景数据。
 */
export const normalizeBillboardColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((item) => item.repeat(2))
      .join('')
      .toUpperCase()}`
  }
  return fallback
}

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  return value.slice(0, BILLBOARD_MAX_TEXT_LENGTH)
}

const normalizeRun = (value: unknown, fallback: BillboardTextRun): BillboardTextRun => {
  if (!isRecord(value)) return { ...fallback }
  return {
    text: normalizeText(value.text, fallback.text),
    color: normalizeBillboardColor(value.color, fallback.color),
    fontSize: clampNumber(value.fontSize, fallback.fontSize, 12, 96),
    fontWeight: value.fontWeight === 'bold' ? 'bold' : 'normal',
    /** 仅写入 Canvas 2D 可复现的样式值，旧 run 缺失字段时稳定回退为默认外观。 */
    fontStyle: value.fontStyle === 'italic' ? 'italic' : 'normal',
    textDecoration: value.textDecoration === 'underline' ? 'underline' : 'none',
    letterSpacing: clampNumber(
      value.letterSpacing,
      0,
      BILLBOARD_LETTER_SPACING_RANGE.min,
      BILLBOARD_LETTER_SPACING_RANGE.max,
    ),
  }
}

/**
 * 归一化内容块可见性。
 *
 * 历史看板没有 visible 字段，必须继续按可见处理；只有新默认段落显式写入 false 时才隐藏，
 * 这样升级不会让用户已有的段落内容突然消失。
 */
const normalizeBlockVisibility = (value: unknown, fallback = true): boolean =>
  typeof value === 'boolean' ? value : fallback

/** label 块默认背景色 */
const DEFAULT_LABEL_BACKGROUND = '#333333'
/** 三维看板底色默认透明；只有用户明确选择有效颜色时才绘制不透明底色。 */
const BILLBOARD_DEFAULT_BACKGROUND_COLOR = 'transparent' as const
/** label 块默认圆角半径 */
const DEFAULT_LABEL_RADIUS = 4
/** image 块默认缩放模式 */
const DEFAULT_IMAGE_FIT: BillboardImageFit = 'contain'
/** image 块默认颜色；白色作为中性值，不改变原图颜色。 */
const DEFAULT_IMAGE_COLOR = '#FFFFFF'
/** image 块默认高度（0 表示按宽度等比） */
const DEFAULT_IMAGE_HEIGHT = 0
/** image 块默认宽度（0 表示填满内容宽度） */
const DEFAULT_IMAGE_WIDTH = 0
/** image 块默认透明度 */
const DEFAULT_IMAGE_OPACITY = 1
/** image 块默认圆角 */
const DEFAULT_IMAGE_RADIUS = 0
/** divider 块默认颜色 */
const DEFAULT_DIVIDER_COLOR = '#CCCCCC'
/** divider 块默认粗细 */
const DEFAULT_DIVIDER_WIDTH = 1
/** label 块文本最大字符数，防止单行过长溢出画布 */
const BILLBOARD_MAX_LABEL_TEXT_LENGTH = 32
/** divider 块粗细上限 */
const BILLBOARD_MAX_DIVIDER_WIDTH = 8

/**
 * 创建指定类型的默认内容块。
 *
 * 每种 block 类型有独立的默认值策略：
 * - title/paragraph：含默认文本片段；标题立即可见，段落保留为默认隐藏的可编辑模板。
 * - label：含默认标签文本和背景色，药丸样式。
 * - image：无文本，包含图片 URL、颜色和尺寸，默认等比缩放。
 * - divider：无文本无图片，只有分割线默认颜色和粗细。
 */
const createDefaultBlock = (type: BillboardContentBlock['type']): BillboardContentBlock => {
  if (type === 'label') {
    return {
      type: 'label',
      visible: true,
      align: 'left',
      verticalAlign: 'auto',
      position: [0, 0],
      runs: [
        {
          text: '标签',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 'normal',
        },
      ],
      labelBackground: DEFAULT_LABEL_BACKGROUND,
      labelRadius: DEFAULT_LABEL_RADIUS,
    }
  }

  if (type === 'image') {
    return {
      type: 'image',
      visible: true,
      align: 'center',
      /** 新建图片块默认在看板内容区水平、垂直居中；历史图片缺失该字段仍由归一化回退 auto。 */
      verticalAlign: 'center',
      position: [0, 0],
      imageSrc: '',
      imageColor: DEFAULT_IMAGE_COLOR,
      imageEmissive: BILLBOARD_IMAGE_EMISSIVE_RANGE.min,
      imageEmissiveColor: BILLBOARD_DEFAULT_IMAGE_EMISSIVE_COLOR,
      imageFit: DEFAULT_IMAGE_FIT,
      imageWidth: DEFAULT_IMAGE_WIDTH,
      imageHeight: DEFAULT_IMAGE_HEIGHT,
      imageOpacity: DEFAULT_IMAGE_OPACITY,
      imageRadius: DEFAULT_IMAGE_RADIUS,
    }
  }

  if (type === 'divider') {
    return {
      type: 'divider',
      visible: true,
      align: 'center',
      verticalAlign: 'auto',
      position: [0, 0],
      dividerColor: DEFAULT_DIVIDER_COLOR,
      dividerWidth: DEFAULT_DIVIDER_WIDTH,
    }
  }

  // title / paragraph
  return {
    type,
    /** 默认段落仅作为可编辑模板保留，首次拖入看板时不直接显示提示文案。 */
    visible: type === 'paragraph' ? false : true,
    align: type === 'title' ? 'center' : 'left',
    /** 标题沿内容流排在图标前方；段落预设为垂直居中，显示后可叠加到图标中部。 */
    verticalAlign: type === 'paragraph' ? 'center' : 'auto',
    position: [0, 0],
    /** 文本宽度默认自动适配内容区，旧配置和新建块都保持横向排版兼容。 */
    textWidth: BILLBOARD_TEXT_WIDTH_RANGE.min,
    runs: [
      {
        text: type === 'title' ? DEFAULT_TITLE_TEXT : DEFAULT_PARAGRAPH_TEXT,
        color: '#FFFFFF',
        fontSize:
          type === 'title'
            ? BILLBOARD_DEFAULT_TITLE_FONT_SIZE
            : BILLBOARD_DEFAULT_PARAGRAPH_FONT_SIZE,
        fontWeight: type === 'title' ? 'bold' : 'normal',
      },
    ],
  }
}

/**
 * 判断值是否为已知的 block 类型字符串。
 */
const isKnownBlockType = (value: unknown): value is BillboardContentBlock['type'] => {
  return (
    value === 'title' ||
    value === 'paragraph' ||
    value === 'label' ||
    value === 'image' ||
    value === 'divider'
  )
}

/**
 * 归一化 image 缩放模式。
 */
const normalizeImageFit = (value: unknown): BillboardImageFit => {
  return value === 'cover' || value === 'stretch' ? value : DEFAULT_IMAGE_FIT
}

/**
 * 归一化图片资源编号。
 *
 * 资源编号来自 OSS 文件服务，必须按字符串保留，不能转成 number，否则较长的雪花编号会发生
 * 精度丢失。空值不进入领域配置，避免保存器把空字符串误判为正式资源引用。
 */
const normalizeImageResourceKey = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/**
 * 纵向对齐只接受四种稳定语义。旧场景没有该字段时回退 auto，从而继续使用原有整体居中、
 * 块间顺序排版；异常字符串同样收敛到 auto，避免画布层出现不可预测坐标。
 */
const normalizeVerticalAlign = (
  value: unknown,
): NonNullable<BillboardContentBlock['verticalAlign']> => {
  return value === 'top' || value === 'center' || value === 'bottom' ? value : 'auto'
}

/**
 * 归一化单个内容块。
 *
 * 按块类型分发到不同归一化逻辑：
 * - title/paragraph：多行富文本，支持多 run 不同字号/颜色/粗体。
 * - label：单行文本（截断到 32 字符），带背景色和圆角。
 * - image：图片 URL、宽高、缩放模式、透明度和圆角。
 * - divider：分割线颜色 + 粗细。
 *
 * 未知 type 回退为 paragraph，保证旧数据和异常输入安全收敛。
 */
const normalizeBlock = (value: unknown, fallbackType: BillboardContentBlock['type']) => {
  if (!isRecord(value)) return createDefaultBlock(fallbackType)

  const type = isKnownBlockType(value.type) ? value.type : 'paragraph'
  const align = value.align === 'center' || value.align === 'right' ? value.align : 'left'
  const verticalAlign = normalizeVerticalAlign(value.verticalAlign)

  // --- label：单行文本 + 背景色 + 圆角 ---
  if (type === 'label') {
    const fallbackRun = createDefaultBlock('label').runs![0]
    const sourceRuns = Array.isArray(value.runs) ? value.runs.slice(0, BILLBOARD_MAX_RUN_COUNT) : []
    let remainingTextLength = BILLBOARD_MAX_LABEL_TEXT_LENGTH
    const runs: BillboardTextRun[] = []
    for (const run of sourceRuns) {
      if (remainingTextLength <= 0) break
      const normalizedRun = normalizeRun(run, fallbackRun)
      const text = normalizedRun.text.slice(0, remainingTextLength)
      remainingTextLength -= text.length
      runs.push({ ...normalizedRun, text })
    }

    return {
      type: 'label' as const,
      visible: normalizeBlockVisibility(value.visible),
      align,
      verticalAlign,
      position: normalizeContentPosition(value.position),
      runs: runs.length > 0 ? runs : [fallbackRun],
      labelBackground: normalizeBillboardColor(value.labelBackground, DEFAULT_LABEL_BACKGROUND),
      labelRadius: clampNumber(value.labelRadius, DEFAULT_LABEL_RADIUS, 0, 32),
    } satisfies BillboardContentBlock
  }

  // --- image：图片 URL + 缩放模式 + 块高度 ---
  if (type === 'image') {
    const imageSrc = typeof value.imageSrc === 'string' ? value.imageSrc.trim() : ''
    const imageResourceKey = normalizeImageResourceKey(value.imageResourceKey)
    return {
      type: 'image' as const,
      visible: normalizeBlockVisibility(value.visible),
      align,
      verticalAlign,
      position: normalizeContentPosition(value.position),
      imageSrc,
      ...(imageResourceKey ? { imageResourceKey } : {}),
      imageColor: normalizeBillboardColor(value.imageColor, DEFAULT_IMAGE_COLOR),
      /** 自发光只作为可选增亮参数保存，旧图片默认关闭以保持历史画面不变。 */
      imageEmissive: clampNumber(
        value.imageEmissive,
        BILLBOARD_IMAGE_EMISSIVE_RANGE.min,
        BILLBOARD_IMAGE_EMISSIVE_RANGE.min,
        BILLBOARD_IMAGE_EMISSIVE_RANGE.max,
      ),
      /** 自发光颜色缺失时使用白色，避免历史图片启用强度后出现空色值。 */
      imageEmissiveColor: normalizeBillboardColor(
        value.imageEmissiveColor,
        BILLBOARD_DEFAULT_IMAGE_EMISSIVE_COLOR,
      ),
      imageFit: normalizeImageFit(value.imageFit),
      imageWidth: clampNumber(value.imageWidth, DEFAULT_IMAGE_WIDTH, 0, BILLBOARD_MAX_IMAGE_SIZE),
      imageHeight: clampNumber(
        value.imageHeight,
        DEFAULT_IMAGE_HEIGHT,
        0,
        BILLBOARD_MAX_IMAGE_SIZE,
      ),
      imageOpacity: clampNumber(value.imageOpacity, DEFAULT_IMAGE_OPACITY, 0, 1),
      imageRadius: clampNumber(value.imageRadius, DEFAULT_IMAGE_RADIUS, 0, 256),
    } satisfies BillboardContentBlock
  }

  // --- divider：分割线颜色 + 粗细 ---
  if (type === 'divider') {
    return {
      type: 'divider' as const,
      visible: normalizeBlockVisibility(value.visible),
      align,
      verticalAlign,
      position: normalizeContentPosition(value.position),
      dividerColor: normalizeBillboardColor(value.dividerColor, DEFAULT_DIVIDER_COLOR),
      dividerWidth: clampNumber(
        value.dividerWidth,
        DEFAULT_DIVIDER_WIDTH,
        1,
        BILLBOARD_MAX_DIVIDER_WIDTH,
      ),
    } satisfies BillboardContentBlock
  }

  // --- title / paragraph：多行富文本 ---
  const fallback = createDefaultBlock(type)
  const fallbackRun = fallback.runs![0]
  const sourceRuns = Array.isArray(value.runs) ? value.runs.slice(0, BILLBOARD_MAX_RUN_COUNT) : []
  let remainingTextLength = BILLBOARD_MAX_BLOCK_TEXT_LENGTH
  const runs: BillboardTextRun[] = []
  for (const run of sourceRuns) {
    if (remainingTextLength <= 0) break
    const normalizedRun = normalizeRun(run, fallbackRun)
    const text = normalizedRun.text.slice(0, remainingTextLength)
    remainingTextLength -= text.length
    runs.push({ ...normalizedRun, text })
  }

  return {
    type: type as 'title' | 'paragraph',
    visible: normalizeBlockVisibility(value.visible),
    align,
    verticalAlign,
    position: normalizeContentPosition(value.position),
    /** 0 表示自动宽度；正数由绘制器作为文本换行区域使用，并受画布上限保护。 */
    textWidth: clampNumber(
      value.textWidth,
      BILLBOARD_TEXT_WIDTH_RANGE.min,
      BILLBOARD_TEXT_WIDTH_RANGE.min,
      BILLBOARD_TEXT_WIDTH_RANGE.max,
    ),
    /** 空 runs 会让绘制器遗漏默认提示；这里回填一个受限默认片段以保持可见且可编辑。 */
    runs: runs.length > 0 ? runs : [fallbackRun],
  } satisfies BillboardContentBlock
}

const normalizePadding = (value: unknown): [number, number, number, number] => {
  if (!Array.isArray(value) || value.length !== 4) return [...DEFAULT_PADDING]
  return value.map((item, index) => clampNumber(item, DEFAULT_PADDING[index], 0, 256)) as [
    number,
    number,
    number,
    number,
  ]
}

const normalizeAppearance = (value: unknown): BillboardAppearance => {
  const source = isRecord(value) ? value : {}
  /** 先确定最大显示距离，再限制 near/far，保证距离始终可插值且不会出现反向区间。 */
  const maximumDisplayDistance = clampNumber(
    source.maximumDisplayDistance,
    BILLBOARD_DEFAULT_MAXIMUM_DISPLAY_DISTANCE,
    1,
    BILLBOARD_DISTANCE_RANGE.max,
  )
  const nearDistance = clampNumber(
    source.nearDistance,
    BILLBOARD_DEFAULT_NEAR_DISTANCE,
    BILLBOARD_DISTANCE_RANGE.min,
    Math.max(BILLBOARD_DISTANCE_RANGE.min, maximumDisplayDistance - 1),
  )
  const farDistance = clampNumber(
    source.farDistance,
    Math.min(BILLBOARD_DEFAULT_FAR_DISTANCE, maximumDisplayDistance),
    Math.min(maximumDisplayDistance, nearDistance + 1),
    maximumDisplayDistance,
  )
  const backgroundImage =
    typeof source.backgroundImage === 'string' && source.backgroundImage.trim()
      ? source.backgroundImage.trim()
      : null
  const backgroundImageResourceKey = normalizeImageResourceKey(source.backgroundImageResourceKey)
  /** 缺失或非法底色均按透明处理，保证新建看板默认不遮挡模型；有效历史颜色继续保留。 */
  const backgroundColor =
    source.backgroundColor === 'transparent'
      ? BILLBOARD_DEFAULT_BACKGROUND_COLOR
      : normalizeBillboardColor(source.backgroundColor, BILLBOARD_DEFAULT_BACKGROUND_COLOR)

  return {
    /**
     * 宽高与属性面板共享最小值和默认值，缺失字段使用统一的 60×60 紧凑正方形；显式输入的小尺寸
     * 仍只受正数下限保护，避免零尺寸 Canvas 导致纹理和布局失效。
     */
    width: clampNumber(
      source.width,
      BILLBOARD_DEFAULT_WIDTH,
      BILLBOARD_MIN_SIZE,
      BILLBOARD_MAX_SIZE,
    ),
    height: clampNumber(
      source.height,
      BILLBOARD_DEFAULT_HEIGHT,
      BILLBOARD_MIN_SIZE,
      BILLBOARD_MAX_SIZE,
    ),
    nearDistance,
    farDistance,
    nearScale: clampNumber(
      source.nearScale,
      BILLBOARD_DEFAULT_NEAR_SCALE,
      BILLBOARD_DISTANCE_SCALE_RANGE.min,
      BILLBOARD_DISTANCE_SCALE_RANGE.max,
    ),
    farScale: clampNumber(
      source.farScale,
      BILLBOARD_DEFAULT_FAR_SCALE,
      BILLBOARD_DISTANCE_SCALE_RANGE.min,
      BILLBOARD_DISTANCE_SCALE_RANGE.max,
    ),
    maximumDisplayDistance,
    padding: normalizePadding(source.padding),
    backgroundColor,
    backgroundImage,
    ...(backgroundImageResourceKey ? { backgroundImageResourceKey } : {}),
    /** 背景图片颜色与内容图片使用同一套十六进制协议，缺失时保持原图颜色。 */
    backgroundImageColor: normalizeBillboardColor(source.backgroundImageColor, DEFAULT_IMAGE_COLOR),
    /** 背景图片自发光默认关闭；开启后仅在原图 Alpha 范围内做屏幕增亮。 */
    backgroundImageEmissive: clampNumber(
      source.backgroundImageEmissive,
      BILLBOARD_IMAGE_EMISSIVE_RANGE.min,
      BILLBOARD_IMAGE_EMISSIVE_RANGE.min,
      BILLBOARD_IMAGE_EMISSIVE_RANGE.max,
    ),
    /** 背景图片自发光颜色默认白色，保持历史看板仅增加亮度、不改变色相。 */
    backgroundImageEmissiveColor: normalizeBillboardColor(
      source.backgroundImageEmissiveColor,
      BILLBOARD_DEFAULT_IMAGE_EMISSIVE_COLOR,
    ),
    borderColor: normalizeBillboardColor(source.borderColor, '#38BDF8'),
    /** 新看板不再默认绘制外框；显式携带的历史边框值仍保留，保证旧场景视觉不被强制改写。 */
    borderWidth: clampNumber(source.borderWidth, 0, 0, 16),
    opacity: clampNumber(source.opacity, 1, 0, 1),
  }
}

/**
 * 创建独立的默认看板配置。
 *
 * 每次返回新对象和新数组，命令快照、Vue 表单与运行时绘制缓存之间不会共享可变引用；默认看板
 * 始终包含标题和段落，段落默认隐藏。拖拽卡片若提供图标地址，则在标题与段落之间插入 120×150
 * 的图片块，保证标题位于图标上方、段落可在图标中部叠加显示。
 */
export const createDefaultBillboardConfig = (iconImageSrc?: string): BillboardConfig => {
  const normalizedIconImageSrc = typeof iconImageSrc === 'string' ? iconImageSrc.trim() : ''
  const blocks: BillboardContentBlock[] = [createDefaultBlock('title')]

  /**
   * 组件拖拽模型会传入默认图标地址；把图标作为独立图片块写入 Canvas，标题可自然排在图标上方，
   * 段落则可以复用垂直居中位置。无图标地址时保持纯文本默认配置，兼容单元测试与历史调用方。
   */
  if (normalizedIconImageSrc) {
    blocks.push({
      ...createDefaultBlock('image'),
      imageSrc: normalizedIconImageSrc,
      imageFit: 'contain',
      imageWidth: BILLBOARD_DEFAULT_ICON_WIDTH,
      imageHeight: BILLBOARD_DEFAULT_ICON_HEIGHT,
    })
  }

  blocks.push(createDefaultBlock('paragraph'))

  return {
    schemaVersion: 1,
    content: { blocks },
    appearance: normalizeAppearance(undefined),
  }
}

/**
 * 将看板输入收敛为可保存的纯 JSON 配置。
 *
 * 该函数是命令与场景解析阶段的唯一归一化入口：文本数量、尺寸、透明度和颜色均在这里限制，
 * Runtime 只消费已规范化的数据，不重复猜测业务默认值。旧 Sprite 缺少配置时传入 `undefined`
 * 会得到最小兼容配置，因此历史场景不会因为升级看板协议而无法打开。
 */
export const normalizeBillboardConfig = (value: unknown): BillboardConfig => {
  if (!isRecord(value)) return createDefaultBillboardConfig()

  const contentSource = isRecord(value.content) ? value.content : {}
  const sourceBlocks = Array.isArray(contentSource.blocks)
    ? contentSource.blocks.slice(0, BILLBOARD_MAX_BLOCK_COUNT)
    : []
  const blocks = sourceBlocks.map((block, index) =>
    normalizeBlock(block, index === 0 ? 'title' : 'paragraph'),
  )

  return {
    /** 当前只有第一版配置协议；未知版本安全收敛为 1，避免 Runtime 处理未定义的字段语义。 */
    schemaVersion: 1,
    content: {
      blocks: blocks.length > 0 ? blocks : createDefaultBillboardConfig().content.blocks,
    },
    appearance: normalizeAppearance(value.appearance),
  }
}
