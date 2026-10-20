import * as monaco from 'monaco-editor'

interface Props {
  language?: string
}
export const useMonaco = (props?: Props) => {
  const { language = 'javascript' } = props || {}

  const editorContainerRef = ref<HTMLElement | null>(null)
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const resizeObserver = new ResizeObserver(() => {
    editor.value?.layout()
  })

  onMounted(() => {
    monaco.editor.setTheme('vs-dark')
    editor.value = monaco.editor.create(editorContainerRef.value!, {
      language,
      theme: 'vs-dark',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
    })
    resizeObserver.observe(editorContainerRef.value!)
  })

  onUnmounted(() => {
    editorContainerRef.value = null
    editor.value?.dispose()
    resizeObserver.disconnect()
  })

  return { editorContainerRef, editor }
}
