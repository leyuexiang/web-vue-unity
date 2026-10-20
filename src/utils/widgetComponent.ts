import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { cloneDeep, isPlainObject, mergeWith } from 'lodash-es'
import {
  PAGE_FRAME_SCHEMA_VERSION,
  normalizePageFrameOption,
} from '@/packages/components/Widget/VPageMenu/pageFrameTypes'

type WidgetComponentLike = BaseWidgetConfig & {
  styles?: {
    animations?: unknown
  }
}

/**
 * 旧场景里的组件配置没有公共样式层。
 * 动画能力上线后，画布层和右侧动画面板都会读取 `styles.animations`，
 * 因此回显时必须先把旧数据补成新结构，避免整个 DOM 渲染链因为缺字段中断。
 *
 * 旧版曾保存 placement 锚点字段；新版统一缩放整个 1920x1080 舞台，
 * 单部件不再需要锚点语义，加载时直接剔除，保存后自然完成数据清理。
 */
export const normalizeWidgetComponent = <T extends WidgetComponentLike>(component: T): T => {
  const normalizedStyles: { animations?: unknown } =
    component.styles && typeof component.styles === 'object' ? component.styles : {}

  component.styles = {
    ...normalizedStyles,
    /**
     * 当前版本公共动画仍然只消费单值数组。
     * 非数组旧值直接归零，宁可退化成“无动画”，也不能让运行时读取异常。
     */
    animations: Array.isArray(normalizedStyles.animations) ? normalizedStyles.animations : [],
  }

  const attrWithoutLegacyPlacement = {
    ...component.attr,
  } as T['attr'] & { placement?: unknown }
  delete attrWithoutLegacyPlacement.placement
  component.attr = attrWithoutLegacyPlacement

  return component
}

/**
 * 把持久化的二维纯数据覆盖到组件默认 Config 实例上。
 *
 * 场景 JSON 不允许保存函数和 ECharts 运行时实例，因此加载时必须先创建当前版本的默认 Config，
 * 再合并用户保存的纯数据覆盖项。数组采用整体替换，避免 lodash 按索引合并后残留旧系列、旧动画或
 * 旧数据行；保存值是普通对象而默认值是渐变等类实例时，也以保存值整体覆盖，交给 ECharts 按配置
 * 对象解释。这样既能恢复内置 formatter/color 函数，又不会覆盖用户实际编辑的字段。
 */
export const mergeWidgetComponentWithDefaults = <T extends WidgetComponentLike>(
  defaultComponent: T,
  savedComponent: T,
): T => {
  /**
   * VPageMenu v1 与页面框架 v2 的语义完全不同，不能把旧 title/menus 按字段合并进新版。
   * 重置时仅保留位置、层级和通用状态；旧数据映射被清空，避免它误写到新的嵌套槽位。
   */
  if (
    defaultComponent.info.keyName === 'VPageMenu' &&
    (savedComponent.option as { schemaVersion?: unknown } | undefined)?.schemaVersion !==
      PAGE_FRAME_SCHEMA_VERSION
  ) {
    const reset = cloneDeep(defaultComponent)
    const savedAttr = savedComponent.attr || reset.attr
    reset.attr = {
      ...reset.attr,
      l: Number.isFinite(Number(savedAttr.l)) ? Number(savedAttr.l) : reset.attr.l,
      t: Number.isFinite(Number(savedAttr.t)) ? Number(savedAttr.t) : reset.attr.t,
      zIndex: Number.isFinite(Number(savedAttr.zIndex)) ? Number(savedAttr.zIndex) : reset.attr.zIndex,
      w: 1920,
      h: 1080,
    }
    const savedOption = (savedComponent.option || {}) as Record<string, unknown>
    reset.option = {
      ...normalizePageFrameOption(reset.option),
      visible: savedOption.visible !== false,
      locked: savedOption.locked === true,
    }
    reset.styles = cloneDeep(savedComponent.styles || reset.styles)
    reset.statusList = cloneDeep(savedComponent.statusList || [])
    reset.interactiveEvent = cloneDeep(savedComponent.interactiveEvent || [])
    reset.dataConfig = undefined
    return normalizeWidgetComponent(reset)
  }

  const merged = mergeWith(
    defaultComponent,
    cloneDeep(savedComponent),
    (defaultValue: unknown, savedValue: unknown) => {
      if (Array.isArray(savedValue)) return cloneDeep(savedValue)
      if (isPlainObject(savedValue) && defaultValue && !isPlainObject(defaultValue)) {
        return cloneDeep(savedValue)
      }
      return undefined
    },
  ) as T

  if (merged.info.keyName === 'VPageMenu') {
    merged.option = normalizePageFrameOption(merged.option)
  }

  return normalizeWidgetComponent(merged)
}
