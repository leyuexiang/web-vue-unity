import { DIM3D_TEMPLATE_TYPE, type Dim3dTemplateType } from '@/servers/manual/dim3d/api/template'

export interface TemplateTypeOption {
  value: Dim3dTemplateType
  label: string
}

/**
 * 模板类型属于固定产品枚举，页签与编辑/另存弹窗必须共用这一份配置。
 * 中文文案和提交值均不依赖字典接口，避免不同入口出现值域或显示内容不一致。
 */
export const TEMPLATE_TYPE_OPTIONS: TemplateTypeOption[] = [
  { value: DIM3D_TEMPLATE_TYPE.INDUSTRY, label: '行业方案' },
  { value: DIM3D_TEMPLATE_TYPE.EXHIBITION, label: '展厅模板' },
]

/** 另存为模板默认选择行业方案，与模板管理页默认激活页签保持一致。 */
export const DEFAULT_TEMPLATE_TYPE = DIM3D_TEMPLATE_TYPE.INDUSTRY
