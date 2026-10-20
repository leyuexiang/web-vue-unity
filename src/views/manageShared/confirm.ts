import { ElMessageBox } from 'element-plus'
import { h } from 'vue'

type ModelStatus = 'ONLINE' | 'OFFLINE'

/**
 * 统一生成管理端紧凑确认弹窗的正文。
 * 设计稿的正文只有一段完整语义，名称以中文引号突出显示，避免旧实现拆成多行标签后拉高弹窗高度。
 */
function createConfirmMessage(message: string) {
  return h('p', { class: 'manage-message-box__description' }, message)
}

function createDeleteConfirmMessage(targetLabel: string, targetName: string) {
  return createConfirmMessage(`确定要删除${targetLabel}「${targetName}」吗？删除后不可恢复。`)
}

/** 删除确认供模型、图标和场景共用，调用方仅传入业务名称，避免页面复制视觉与关闭逻辑。 */
export function openManageDeleteConfirm(targetLabel: string, targetName: string) {
  return ElMessageBox.confirm(createDeleteConfirmMessage(targetLabel, targetName), '确认删除', {
    customClass: 'manage-message-box manage-message-box--danger',
    confirmButtonText: '确认删除',
    confirmButtonClass: 'manage-message-box__confirm manage-message-box__confirm--danger',
    cancelButtonText: '取 消',
    closeOnClickModal: false,
    closeOnPressEscape: false,
  })
}

/**
 * 模型状态确认只在用户显式确认后才允许调用状态接口。
 * 上线使用主品牌绿色，下线使用警示橙色；文案与 Figma 的可见性提示保持一致。
 */
export function openManageModelStatusConfirm(status: ModelStatus, targetName: string) {
  const isOnline = status === 'ONLINE'
  const action = isOnline ? '上线' : '下线'
  const consequence = isOnline ? '上线后将对所有用户可见。' : '下线后将无法被用户访问。'

  return ElMessageBox.confirm(
    createConfirmMessage(`确定要将模型「${targetName}」${action}吗？${consequence}`),
    `确认${action}`,
    {
      customClass: `manage-message-box manage-message-box--${isOnline ? 'online' : 'offline'}`,
      confirmButtonText: `确认${action}`,
      confirmButtonClass: `manage-message-box__confirm manage-message-box__confirm--${isOnline ? 'online' : 'offline'}`,
      cancelButtonText: '取 消',
      closeOnClickModal: false,
      closeOnPressEscape: false,
    },
  )
}

/** 图标等资源共用状态确认视觉；文案不再把非模型资源误称为模型。 */
export function openManageResourceStatusConfirm(
  status: ModelStatus,
  targetLabel: string,
  targetName: string,
) {
  const isOnline = status === 'ONLINE'
  const action = isOnline ? '上线' : '下线'
  const consequence = isOnline ? '上线后将对所有用户可见。' : '下线后将无法被用户访问。'

  return ElMessageBox.confirm(
    createConfirmMessage(`确定要将${targetLabel}「${targetName}」${action}吗？${consequence}`),
    `确认${action}`,
    {
      customClass: `manage-message-box manage-message-box--${isOnline ? 'online' : 'offline'}`,
      confirmButtonText: `确认${action}`,
      confirmButtonClass: `manage-message-box__confirm manage-message-box__confirm--${isOnline ? 'online' : 'offline'}`,
      cancelButtonText: '取 消',
      closeOnClickModal: false,
      closeOnPressEscape: false,
    },
  )
}

/** 场景取消发布使用独立文案，视觉仍复用状态确认弹窗的橙色危险样式。 */
export function openManageSceneUnpublishConfirm(targetName: string) {
  return ElMessageBox.confirm(
    createConfirmMessage(`确定要将场景「${targetName}」取消发布吗？取消发布后将无法被用户访问。`),
    '确认取消发布',
    {
      customClass:
        'manage-message-box manage-message-box--offline manage-message-box--scene-unpublish',
      confirmButtonText: '确认取消',
      confirmButtonClass: 'manage-message-box__confirm manage-message-box__confirm--offline',
      cancelButtonText: '取 消',
      closeOnClickModal: false,
      closeOnPressEscape: false,
    },
  )
}

/**
 * 场景被其他用户占用时复用 Figma 2495:2800 的温馨提示弹窗。
 * 未发布场景只显示“知道了”；已发布场景允许用户确认后进入只读预览，避免把不可预览的草稿暴露出去。
 */
export function openManageSceneLockedConfirm(isPublished: boolean) {
  const message = createConfirmMessage(
    '当前已有其他用户正在编辑该内容，为避免内容冲突，请稍后再尝试。',
  )
  const baseOptions = {
    closeOnClickModal: false,
    closeOnPressEscape: false,
  }

  if (!isPublished) {
    return ElMessageBox.alert(message, '温馨提示', {
      ...baseOptions,
      customClass: 'manage-message-box manage-message-box--scene-locked',
      confirmButtonText: '知道了',
      confirmButtonClass: 'manage-message-box__confirm manage-message-box__confirm--online',
    })
  }

  return ElMessageBox.confirm(message, '温馨提示', {
    ...baseOptions,
    customClass:
      'manage-message-box manage-message-box--scene-locked manage-message-box--scene-locked-preview',
    confirmButtonText: '预览',
    confirmButtonClass: 'manage-message-box__confirm manage-message-box__confirm--online',
    cancelButtonText: '取 消',
  })
}
