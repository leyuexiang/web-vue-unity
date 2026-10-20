import { TRANSFORM_CONTROLS_ENUM, MEASURE_ENUM } from '@/enums/scenePanelEnum'
import handIcon from '@/assets/images/scene-editor-tool-hand.svg'
import rotateIcon from '@/assets/images/scene-editor-tool-rotate.svg'
import scaleIcon from '@/assets/images/scene-editor-tool-scale.svg'
import distanceIcon from '@/assets/images/scene-editor-tool-distance.svg'
import angleIcon from '@/assets/images/scene-editor-tool-angle.svg'

/**
 * 图标资源直接对应设计稿的 20px 矢量图层。
 * 组件以原始图片元素渲染，避免部分浏览器无法解析 CSS 遮罩变量而退化成纯色方块；
 * 图标映射只影响视觉资源，变换、测量和历史操作仍沿用原有逻辑。
 */

export const transformTypeList = [
  {
    type: TRANSFORM_CONTROLS_ENUM.Translate,
    icon: handIcon,
    label: '平移',
  },
  {
    type: TRANSFORM_CONTROLS_ENUM.Rotate,
    icon: rotateIcon,
    label: '旋转',
  },
  {
    type: TRANSFORM_CONTROLS_ENUM.Scale,
    icon: scaleIcon,
    label: '缩放',
  },
]

export const measureTypeList = [
  {
    type: MEASURE_ENUM.Distance,
    icon: distanceIcon,
    label: '距离测量',
  },
  {
    type: MEASURE_ENUM.Angle,
    icon: angleIcon,
    label: '角度测量',
  },
]
