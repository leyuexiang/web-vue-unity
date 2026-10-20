<template>
  <!--
    Figma“富文本框”在当前业务中承载 JSON/TXT 等结构化文本，不是所见即所得编辑器。
    共享组件统一标题、文本区、操作按钮和错误提示，业务面板只保留导入、下载及数据持久化逻辑。
  -->
  <section class="scene-edit-property-rich-text-block" :style="blockStyle">
    <button
      class="scene-edit-property-rich-text-block__header"
      type="button"
      :aria-expanded="expanded"
      :disabled="!collapsible"
      @click="toggleExpanded"
    >
      <span class="scene-edit-property-rich-text-block__title">{{ title }}</span>
      <span
        v-if="collapsible"
        class="scene-edit-collapse-icon"
        :class="{ 'is-expanded': expanded }"
        aria-hidden="true"
      />
    </button>

    <div v-show="expanded" class="scene-edit-property-rich-text-block__body">
      <!--
        可编辑和只读数据必须使用同一个 ScenePropertyInput 结构，不能再用 div/pre 模拟只读框。
        这样四种请求方式天然共享边框、内边距、缩放角和滚动条，只由 readonly 控制写入权限。
      -->
      <ScenePropertyInput
        :model-value="contentValue"
        class="scene-edit-property-rich-text-block__editor"
        type="textarea"
        :rows="rows"
        :resize="resize"
        :readonly="readOnly"
        :placeholder="readOnly ? emptyText : placeholder"
        :class="{ 'is-error': Boolean(error) }"
        @update:model-value="handleContentUpdate"
      />

      <div
        v-if="importable || downloadable || slots.actions"
        class="scene-edit-property-rich-text-block__actions"
      >
        <slot name="actions">
          <ScenePropertyButton v-if="importable" size="small" @click="emit('import')">
            {{ importLabel }}
          </ScenePropertyButton>
          <ScenePropertyButton v-if="downloadable" size="small" @click="emit('download')">
            {{ downloadLabel }}
          </ScenePropertyButton>
        </slot>
      </div>

      <p v-if="error" class="scene-edit-property-rich-text-block__error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'

defineOptions({ name: 'ScenePropertyRichTextBlock' })

const props = withDefaults(
  defineProps<{
    /** Figma 复合块标题，默认与数据面板保持一致。 */
    title?: string
    /** 多行输入高度通过行数表达，宽度始终跟随属性面板。 */
    rows?: number
    /**
     * Figma 富文本框的可见编辑高度。使用独立高度而不是依赖浏览器按 rows 推导，
     * 避免字体或行高变化造成不同页面中的同一共享组件高度漂移。
     */
    editorHeight?: number
    /** 是否允许用户拖动文本区高度；横向尺寸禁止拖动，避免破坏可变宽度面板。 */
    resize?: 'none' | 'both' | 'horizontal' | 'vertical'
    placeholder?: string
    error?: string
    /** 动态数据使用调用方提供的只读内容；静态数据始终显示公共多行输入框。 */
    readOnly?: boolean
    /** 动态请求、公共请求及数据集的格式化只读文本，由共享组件统一负责展示和滚动。 */
    displayValue?: string
    /** 无可展示内容时的统一空状态文案。 */
    emptyText?: string
    /** 是否允许折叠；默认开启并使用全局统一的 Figma 折叠图标。 */
    collapsible?: boolean
    /** 初始展开状态只在组件创建时读取，后续交互由组件本地维护，避免折叠触发业务持久化。 */
    defaultExpanded?: boolean
    importable?: boolean
    downloadable?: boolean
    importLabel?: string
    downloadLabel?: string
  }>(),
  {
    title: '数据内容',
    rows: 6,
    // Figma 数据内容框需要同时展示多行结构化数据；168px 可在 300–400px 可变右栏中
    // 提供约 7 行完整 JSON 预览，又不会挤占请求、过滤和属性映射的主要操作区域。
    editorHeight: 168,
    resize: 'vertical',
    placeholder: '',
    error: '',
    readOnly: false,
    displayValue: '',
    emptyText: '暂无数据',
    collapsible: true,
    defaultExpanded: true,
    importable: false,
    downloadable: false,
    importLabel: '导入（JSON/TXT）',
    downloadLabel: '下载',
  },
)

const emit = defineEmits<{
  /** 文件选择与解析属于业务职责，共享组件只抛出操作意图。 */
  (event: 'import'): void
  /** 下载内容和文件名由调用方决定，避免公共层耦合数据格式。 */
  (event: 'download'): void
}>()

const model = defineModel<string>({ default: '' })
const slots = useSlots()
const expanded = ref(props.defaultExpanded)

/** 只写入一个 CSS 自定义属性，宽度仍由父级面板自适应，避免每次渲染创建多套尺寸规则。 */
const blockStyle = computed(() => ({
  '--scene-edit-rich-text-editor-height': `${Math.max(64, props.editorHeight)}px`,
}))

/**
 * 共享输入框只读取一个值来源：静态请求读取可编辑模型，其余请求读取格式化预览。
 * 该计算只依赖两个字符串和一个布尔值，不复制 JSON，也不会随滚动产生额外计算。
 */
const contentValue = computed(() => (props.readOnly ? props.displayValue : model.value))

/** 只读模式拒绝一切写回；静态模式再把共享输入框产生的值归一为字符串。 */
const handleContentUpdate = (value: string | number) => {
  if (props.readOnly) return
  model.value = String(value)
}

/** 折叠仅控制编辑器显示，不销毁输入框，因此不会丢失尚未持久化的文本或滚动位置。 */
const toggleExpanded = () => {
  if (!props.collapsible) return
  expanded.value = !expanded.value
}

/** 在模板中显式使用 props，保留类型检查并便于后续扩展公共变体。 */
void props
</script>
