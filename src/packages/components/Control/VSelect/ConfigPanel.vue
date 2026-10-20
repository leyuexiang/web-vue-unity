<template>
  <div>
    <!-- 字体候选项与页面分页器共用；未配置时保留原有继承字体。 -->
    <setting-item-box name="选中值字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" size="small" placeholder="默认字体">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <!-- 浮层挂载在组件外，单独保存候选项字体供浮层样式使用。 -->
    <setting-item-box name="候选项字体" :alone="true">
      <ScenePropertySelect v-model="option.optionFontFamily" size="small" placeholder="默认字体">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="标签" :alone="true">
      <setting-item>
        <ScenePropertyInput v-model="option.label" placeholder="请输入名称" />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="选项(JSON)" :alone="true">
      <setting-item>
        <div ref="editorContainerRef" style="height: 200px"></div>
      </setting-item>
    </setting-item-box>

    <setting-item-box name="选中值" :alone="true">
      <setting-item>
        <ScenePropertyInput v-model="option.value" placeholder="请输入选中值" />
      </setting-item>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { ElMessage } from 'element-plus'
import Config from './config.ts'
import { useMonaco } from '@/packages/hooks/useMonaco.ts'

defineOptions({ name: 'VSelectConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

const { editorContainerRef, editor } = useMonaco()

watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance) return

    editorInstance.setValue(JSON.stringify(props.option.options, null, 2))

    editorInstance.onDidChangeModelContent(() => {})
    editorInstance.onDidBlurEditorText(() => {
      const newVal = JSON.parse(editorInstance.getValue() || '[]')
      // 校验值,如果有重复,则提示用户,例如 [{label: '1', value: '1'}, {label: '2', value: '1'}]
      const map = new Map()
      newVal.forEach((item: (typeof props.option.options)[number]) => {
        if (map.has(item.value)) {
          ElMessage.warning('选项值重复会引发异常,建议修改')
          return
        }
        map.set(item.value, item)
      })

      props.option.options = JSON.parse(editorInstance.getValue() || '[]')
    })
  },
)

watch(
  () => props.option.options,
  (newVal) => {
    editor.value?.setValue(JSON.stringify(newVal, null, 2))
  },
  { immediate: true },
)
</script>

<style scoped></style>
