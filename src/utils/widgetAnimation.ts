import { animationsClass } from '@/utils/style'

const animationWidgetPackages = new Set(['Decorate', 'Chart', 'Widget', 'Control'])

/**
 * 判断二维部件是否支持公共动画。
 *
 * 该能力属于二维部件协议，而不是画布视图实现；放在 utils 中可同时供视图层和项目适配层复用。
 */
export const canApplyWidgetAnimation = (packageName: string | undefined) => {
  return packageName ? animationWidgetPackages.has(packageName) : false
}

/**
 * 解析二维部件最终动画类名。
 *
 * 已保存动画和 hover 预览动画都在这里合成，预览态优先，避免临时动画写回持久化配置。
 */
export const resolveWidgetAnimationClass = ({
  packageName,
  animations,
  previewAnimation,
}: {
  packageName: string | undefined
  animations: string[] | undefined
  previewAnimation?: string
}) => {
  if (!canApplyWidgetAnimation(packageName)) return ''
  if (previewAnimation) return animationsClass([previewAnimation])
  return animationsClass(animations)
}
