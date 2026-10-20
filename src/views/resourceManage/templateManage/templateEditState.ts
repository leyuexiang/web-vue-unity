import type { Dim3dTemplateForm, Dim3dTemplateType } from '@/servers/manual/dim3d/api/template'

/** 编辑弹窗的最小表单状态；页面显示层与接口字段在此处保持一一对应。 */
export interface TemplateEditFormState {
  templateName: string
  templateDesc: string
  templateType?: Dim3dTemplateType
  category: string
  templateFileId: string
  coverImageId?: string
}

/**
 * 模板管理当前只管理系统模板，页面不存在“我的模板”入口，详情接口也不返回资源归属。
 * 编辑接口仍保留该必填字段，因此在请求边界统一补充系统资源值，禁止由隐藏表单字段或接口缺省值决定。
 */
const SYSTEM_TEMPLATE_RESOURCE_BELONG: Dim3dTemplateForm['resourceBelong'] = 'SYSTEM'

/**
 * 将详情回填或用户输入归一化为编辑请求体。只要缺少用户输入或模板文件编号就返回空值；
 * 资源归属按模板管理的系统资源边界统一补齐，不再依赖详情接口中不存在的字段。
 */
export function createTemplateEditPayload(
  form: TemplateEditFormState,
): Dim3dTemplateForm | undefined {
  const templateName = form.templateName.trim()
  const category = form.category.trim()
  const templateFileId = String(form.templateFileId ?? '').trim()
  const coverImageId = String(form.coverImageId ?? '').trim()

  if (!templateName || !form.templateType || !category || !templateFileId) {
    return undefined
  }

  return {
    templateName,
    templateDesc: form.templateDesc.trim() || undefined,
    templateType: form.templateType,
    category,
    resourceBelong: SYSTEM_TEMPLATE_RESOURCE_BELONG,
    templateFileId,
    coverImageId: coverImageId || undefined,
  }
}

/**
 * 返回首个缺失字段的中文提示。模板文件编号在界面中不展示，但编辑接口保存时仍必填，
 * 因此详情异常时需要明确阻断；资源归属已经在请求边界固定为系统资源，无需参与表单校验。
 */
export function getTemplateEditMissingFieldMessage(form: TemplateEditFormState) {
  if (!form.templateName.trim()) return '请输入模板名称'
  if (!form.templateType) return '请选择模板类型'
  if (!form.category.trim()) return '请选择模板分类'
  if (!String(form.templateFileId ?? '').trim()) return '模板详情缺少模板文件编号，暂不能保存'
  return ''
}
