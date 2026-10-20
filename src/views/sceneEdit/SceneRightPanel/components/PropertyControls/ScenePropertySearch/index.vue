<template>
  <!--
    属性面板共享搜索框。
    搜索图标、32px 高度和焦点态由共享层统一维护；调用方只传递搜索词、占位文字和业务事件。
  -->
  <div
    class="scene-edit-property-search"
    :class="attrs.class"
    :style="rootStyle"
  >
    <ScenePropertyInput
      v-model="model"
      v-bind="controlAttrs"
      class="scene-edit-property-search__input"
      :placeholder="placeholder"
      :clearable="clearable"
      @keyup.enter="emit('search', model)"
    >
      <template #prefix>
        <el-icon class="scene-edit-property-search__icon" aria-hidden="true">
          <Search />
        </el-icon>
      </template>
    </ScenePropertyInput>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'
import { Search } from '@element-plus/icons-vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'

defineOptions({
  /** class/style 由搜索框根节点接管，其余输入属性与事件继续透传到共享输入框。 */
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 未传宽度时填满当前属性行；紧凑搜索场景可传像素或任意合法 CSS 宽度。 */
    width?: string | number
    /** Figma 搜索框默认文案；调用方可按实体、字段等业务语义覆盖。 */
    placeholder?: string
    /** 搜索词存在时允许一键清空，不改变空态下的 Figma 外观。 */
    clearable?: boolean
  }>(),
  {
    width: undefined,
    placeholder: '搜索',
    clearable: true,
  },
)

const emit = defineEmits<{
  /** 回车只通知调用方执行搜索，搜索组件本身不读取或过滤业务数据。 */
  (event: 'search', value: string): void
}>()

const model = defineModel<string>({ default: '' })
const attrs = useAttrs()

/** 将语义宽度和调用方样式合并到外壳，确保面板拖动后内部输入始终跟随剩余宽度。 */
const rootStyle = computed<StyleValue | undefined>(() => {
  const width = props.width
  const widthStyle =
    width === undefined || width === null || width === ''
      ? undefined
      : { width: typeof width === 'number' ? `${width}px` : width }

  if (!widthStyle && !attrs.style) return undefined
  return [widthStyle, attrs.style as StyleValue]
})

/** class/style 已用于搜索框外壳，避免重复落到内部输入节点。 */
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
