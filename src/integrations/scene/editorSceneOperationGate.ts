import { readonly, shallowRef } from 'vue'

/** 编辑器内共享的短期操作门禁，避免异步创建、保存与整场景替换交叉读取不同快照。 */
export type EditorSceneOperation = 'importJson' | 'template' | 'createObject' | 'save' | 'publish' | 'saveTemplate'
const activeOperation = shallowRef<EditorSceneOperation | null>(null)
export const editorSceneOperation = readonly(activeOperation)

/**
 * 同步取得当前页的操作权；释放函数只释放自己持有的凭证。
 * 页面卸载后的迟到任务不能误释放新编辑器刚取得的操作权。
 */
export const beginEditorSceneOperation = (operation: EditorSceneOperation) => {
  if (activeOperation.value) throw new Error('当前场景正在处理其他操作，请完成后重试')
  const token = Symbol(operation)
  activeToken = token
  activeOperation.value = operation
  return () => {
    if (activeToken !== token) return
    activeToken = null
    activeOperation.value = null
  }
}
let activeToken: symbol | null = null
