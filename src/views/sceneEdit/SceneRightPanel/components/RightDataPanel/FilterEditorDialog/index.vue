<template>
  <ScenePropertyDialog
    :model-value="visible"
    class="filter-editor-dialog"
    title="过滤函数编辑器"
    :width="804"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <!--
      Figma 节点 2082:1438 的正文为固定 372 / 1 / 372 三列。
      代码与预览仍完全由现有过滤器逻辑驱动；本容器只负责把可编辑代码和只读结果稳定排布，
      避免预览内容变长时挤压代码输入区或重新触发外部请求。
    -->
    <div class="filter-editor__main">
      <!-- 左侧：仅保留函数体编辑，首尾代码由固定外壳提示，避免用户误修改函数签名。 -->
      <section class="filter-editor__code" aria-label="过滤函数代码">
        <div class="filter-editor__code-boundary">function filter(data, res) {</div>
        <div class="filter-editor__code-input-wrap">
          <ScenePropertyInput
            v-model="codeText"
            type="textarea"
            :rows="18"
            class="filter-editor__textarea"
            placeholder="return data"
            @input="clearValidationError"
          />
          <!-- 校验信息只在错误时覆盖代码区底部，不改变扩展后的固定双栏高度。 -->
          <p v-if="validationError" class="filter-editor__validation-error" role="alert">
            {{ validationError }}
          </p>
        </div>
        <div class="filter-editor__code-boundary">}</div>
      </section>

      <!-- 设计稿中间分隔线仅承担视觉分区，不使用 el-divider 以免带入默认外边距。 -->
      <div class="filter-editor__divider" aria-hidden="true" />

      <!--
        右侧三项均是只读预览，不允许在这里修改源数据。
        预先计算 previewSections，避免每次输入代码时在模板中重复 JSON 序列化三份数据。
      -->
      <section class="filter-editor__preview" aria-label="过滤器数据预览">
        <div
          v-for="section in previewSections"
          :key="section.label"
          class="filter-editor__data-section"
        >
          <span class="filter-editor__data-label">{{ section.label }}</span>
          <ScenePropertyInput
            :model-value="section.content"
            type="textarea"
            :rows="5"
            readonly
            resize="none"
            class="filter-editor__data-content"
            :aria-label="section.label"
          />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="filter-editor__footer">
        <span class="filter-editor__rule-text"
          >规则：过滤器默认处理data/content/唯一数组字段，否则处理原始返回值</span
        >
        <div class="filter-editor__actions">
          <!-- 重置只回填编辑草稿；用户必须点击保存后才会覆盖当前组件的过滤器配置。 -->
          <ScenePropertyButton @click="handleResetToDefault">重置为默认</ScenePropertyButton>
          <ScenePropertyButton @click="handleCancel">取消</ScenePropertyButton>
          <ScenePropertyButton type="primary" :disabled="errorFlag" @click="handleConfirm"
            >保存</ScenePropertyButton
          >
        </div>
      </div>
    </template>
  </ScenePropertyDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'
import {
  customizeHttpRequest,
  resolveDefaultRequestDataPayload,
  resolveRequestPayload,
} from '@/utils/dataConfig'
import { executeDynamicCode, validateDynamicCode } from '@/utils/dynamicCode'
import { appLogger } from '@/utils/logger'
import type { AjaxRequestConfig, PublicRequestConfig } from '@/types/data-config'

const props = defineProps<{
  visible: boolean
  filterFn?: string
  requestConfig?: AjaxRequestConfig
  publicRequests?: PublicRequestConfig[]
  globalConfig?: AjaxRequestConfig
  previewRaw?: unknown
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [filterFn: string, previewPayload: unknown]
}>()

const codeText = ref('')
const validationError = ref('')
const sourceData = ref<unknown>(null)
const requestPayload = ref<unknown>(null)

/**
 * 默认过滤器显式返回标准数据载荷。
 * 集中为常量后，首次打开和“重置为默认”始终回到同一行为，避免两个入口日后出现不一致。
 */
const DEFAULT_FILTER_CODE = 'return data'

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      codeText.value = props.filterFn || DEFAULT_FILTER_CODE
      validationError.value = ''
      sourceData.value = null
      requestPayload.value = null
      // 弹窗打开时优先复用“发送请求”已经拿到的原始响应，避免同一接口重复请求和限流消耗。
      await fetchPreviewData()
    }
  },
)

watch(
  () => props.previewRaw,
  (value) => {
    if (!props.visible || value === null || value === undefined) return
    /**
     * 当用户在弹窗打开期间重新发送请求时，同步刷新预览数据。
     * 这里保存原始响应而不是归一化后的二维表，保证 res 参数和浏览器网络面板看到的内容一致。
     */
    sourceData.value = value
    requestPayload.value = value
  },
)

/**
 * 动态获取过滤器预览数据。
 *
 * 优先使用父面板传入的最近一次原始响应；只有用户尚未点击“发送请求”时，
 * 才回退到重新请求接口，避免过滤器弹窗打开一次就多发一次第三方接口请求。
 */
const fetchPreviewData = async () => {
  if (props.previewRaw !== null && props.previewRaw !== undefined) {
    sourceData.value = props.previewRaw
    requestPayload.value = props.previewRaw
    return
  }

  if (!props.requestConfig) return
  try {
    const res = await customizeHttpRequest(props.requestConfig)
    if (res) {
      sourceData.value = res
      requestPayload.value = resolveRequestPayload(res)
    }
  } catch (error) {
    appLogger.error('FilterEditor', '预览数据请求失败', error)
  }
}

// 过滤结果实时计算
const filterPreview = computed(() => {
  if (!sourceData.value || !codeText.value.trim()) return ''
  const response = cloneDeep(sourceData.value)
  const payload = resolveDefaultRequestDataPayload(response)
  const syntaxError = validateDynamicCode('data-filter', ['data', 'res'], codeText.value)
  if (syntaxError) return `过滤函数错误：${syntaxError}`

  /**
   * 过滤器属于历史兼容的高级能力。
   * 这里统一走受控动态执行工具，避免弹窗内部直接散落高风险脚本执行逻辑。
   */
  const result = executeDynamicCode(
    'data-filter',
    { data: payload, res: response },
    codeText.value,
    payload,
  )
  return JSON.stringify(result, null, 2).slice(0, 2000)
})

const errorFlag = computed(() => filterPreview.value.startsWith('过滤函数错误：'))
const filterResult = computed(() => filterPreview.value)
const sourceDataPayload = computed(() => {
  if (sourceData.value === null || sourceData.value === undefined) return undefined
  return resolveDefaultRequestDataPayload(sourceData.value)
})

/**
 * 预览字符串集中在一个计算属性内生成。
 * 代码输入会触发过滤器结果更新，缓存可避免模板渲染阶段重复执行 JSON.stringify，
 * 同时让三段 56px 只读文本框只消费已经格式化好的稳定字符串。
 */
const previewSections = computed(() => [
  {
    label: '默认过滤数据(data)：',
    content: formatJson(sourceDataPayload.value) || '暂无',
  },
  {
    label: '接口返回数据(res)：',
    content: formatJson(sourceData.value) || '暂无',
  },
  {
    label: '过滤器结果：',
    content: filterResult.value || '暂无',
  },
])

function formatJson(data: unknown): string {
  if (data === null || data === undefined) return ''
  try {
    return JSON.stringify(data, null, 2).slice(0, 2000)
  } catch {
    return String(data)
  }
}

function clearValidationError() {
  validationError.value = ''
}

/**
 * 将当前弹窗草稿恢复为默认过滤逻辑，并立即清除旧逻辑可能留下的语法提示。
 * 不在这里 emit confirm，确保“重置”属于可取消的本地编辑；只有保存才会写回右侧数据配置。
 */
function handleResetToDefault() {
  codeText.value = DEFAULT_FILTER_CODE
  clearValidationError()
}

function handleCancel() {
  emit('update:visible', false)
}

function handleConfirm() {
  // 校验语法
  const syntaxError = validateDynamicCode('syntax-check', ['data', 'res'], codeText.value)
  if (syntaxError) {
    validationError.value = `语法错误: ${syntaxError}`
    return
  }

  // 保留右侧原始响应展示，同时把请求层解包后的载荷交给父面板刷新映射字段。
  emit('confirm', codeText.value, requestPayload.value)
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
/**
 * Figma 节点 2082:1438（804×415）采用与请求配置弹窗相同的纯色外壳。
 * Element Plus 弹窗传送到 body 后不具备当前组件的 scoped 属性，故以路由根节点和业务类名限定全局规则；
 * 仅覆盖过滤器弹窗，避免历史主题的渐变背景、根节点 16px 内边距和胶囊按钮污染其它属性弹窗。
 */

/**
 * 过滤器弹窗经 Element Plus 挂载在 .el-overlay.el-modal-dialog 内。
 * 旧主题使用了“遮罩层 + 通用弹窗”四个类的高优先级规则，并设置了 98% 透明的渐变背景；
 * 若这里不同时带上遮罩层选择器，就会透出画布中的模型轮廓，偏离 Figma 的不透明 #1D2A35 面板。
 * 该规则只处理过滤器编辑器，不能调整其它旧弹窗的兼容外观。
 */
:global(
  body.scene-edit-route-open .el-overlay.el-modal-dialog .filter-editor-dialog.scene-edit-dialog
) {
  padding: 0 !important;
  overflow: hidden;
  background: #1d2a35 !important;
  border: 1px solid rgb(255 255 255 / 5%) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__header) {
  box-sizing: border-box;
  height: 55px;
  padding: 20px 20px 12px !important;
  margin: 0 !important;
  background: #1d2a35 !important;
  border-bottom: 1px solid rgb(255 255 255 / 5%);
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 500;
  line-height: 23px;
  color: #ffffff;
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__headerbtn) {
  top: 19px;
  right: 20px;
  width: 16px;
  height: 16px;
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__close) {
  font-size: 16px;
  color: rgb(255 255 255 / 60%);
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__body) {
  box-sizing: border-box;
  padding: 12px 20px !important;
  overflow: hidden;
  background: #1d2a35 !important;
}
:global(body.scene-edit-route-open .filter-editor-dialog .el-dialog__footer) {
  box-sizing: border-box;
  height: 64px;
  padding: 12px 20px 20px !important;
  background: #1d2a35 !important;
  border-top: 1px solid rgb(255 255 255 / 5%) !important;
}
:global(body.scene-edit-route-open .filter-editor-dialog .filter-editor__actions .el-button) {
  height: 32px;
  min-height: 32px;
  padding: 2px 12px;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  border-radius: 2px !important;
  transform: none;
}
:global(
  body.scene-edit-route-open
    .filter-editor-dialog
    .filter-editor__actions
    .scene-edit-property-button.el-button--primary
) {
  background: #48998e !important;
  border-color: #48998e !important;
}
:global(
  body.scene-edit-route-open
    .filter-editor-dialog
    .filter-editor__actions
    .scene-edit-property-button:not(.el-button--primary)
) {
  color: rgb(255 255 255 / 80%);
  background: transparent !important;
  border-color: rgb(255 255 255 / 40%) !important;
}
.filter-editor__main {
  /**
   * 保持 Figma 的 804px 宽度和三列比例，同时将正文从 272px 提升到 416px。
   * 三个预览项使用同一高度变量等分新增空间，避免右侧任一数据源比其它源少显示内容。
   */
  --filter-editor-main-height: 416px;
  --filter-editor-code-height: 356px;
  --filter-editor-preview-section-height: 128px;

  display: grid;
  grid-template-columns: minmax(0, 372px) 1px minmax(0, 372px);
  column-gap: 10px;
  align-items: stretch;
  height: var(--filter-editor-main-height);
}
.filter-editor__code {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.filter-editor__code-boundary {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 26px;
  align-items: center;
  height: 26px;
  padding: 5px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Roboto, Consolas, monospace;
  font-size: 12px;
  line-height: 16px;
  color: rgb(255 255 255 / 20%);
  white-space: nowrap;
  background: #1b2630;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 2px;
}
.filter-editor__code-input-wrap {
  position: relative;
  min-height: 0;
}
.filter-editor__textarea,
.filter-editor__textarea :deep(.el-textarea),
.filter-editor__textarea :deep(.el-textarea__inner) {
  height: var(--filter-editor-code-height);
  min-height: var(--filter-editor-code-height);
}
.filter-editor__textarea :deep(.el-textarea__inner) {
  padding: 8px 12px;
  font-family: Roboto, Consolas, monospace;
  font-size: 12px;
  line-height: 18px;
  color: rgb(255 255 255 / 80%);
  resize: none;
}
.filter-editor__validation-error {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  padding: 3px 4px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 18px;
  color: #e16e6e;
  white-space: nowrap;
  pointer-events: none;
  background: rgb(19 28 38 / 88%);
}
.filter-editor__divider {
  width: 1px;
  height: var(--filter-editor-main-height);
  background: rgb(255 255 255 / 14%);
}
.filter-editor__preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.filter-editor__data-section {
  display: flex;
  flex: 0 0 var(--filter-editor-preview-section-height);
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.filter-editor__data-label {
  display: block;
  height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: rgb(255 255 255 / 80%);
  white-space: nowrap;
}
.filter-editor__data-content,
.filter-editor__data-content :deep(.el-textarea),
.filter-editor__data-content :deep(.el-textarea__inner) {
  /** 标签固定占 20px、间距占 4px，剩余 104px 全部留给可滚动的数据内容。 */
  height: calc(var(--filter-editor-preview-section-height) - 24px);
  min-height: calc(var(--filter-editor-preview-section-height) - 24px);
}
.filter-editor__data-content :deep(.el-textarea__inner) {
  padding: 8px 12px;
  overflow-y: auto;
  font-family: Roboto, Consolas, monospace;
  font-size: 12px;
  line-height: 18px;
  color: rgb(255 255 255 / 20%);
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
.filter-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.filter-editor__rule-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 17px;
  color: rgb(255 255 255 / 40%);
  white-space: nowrap;
}
.filter-editor__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 16px;
}

/**
 * 宽度受共享弹窗安全边距收缩时，双栏改为纵向布局，避免固定 372px 子列突破视口。
 * 常规 804px 设计尺寸不经过这个分支，因此桌面端仍严格遵循 Figma 的像素间距。
 */
/* stylelint-disable-next-line scss/at-rule-no-unknown -- 插值后的构建产物是浏览器标准 @container。 */
@#{'container'} scene-property-dialog (width < 720px) {
  .filter-editor__main {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 12px;
    height: auto;
  }
  .filter-editor__divider {
    width: 100%;
    height: 1px;
  }
  .filter-editor__preview {
    gap: 12px;
  }
  .filter-editor__footer {
    align-items: flex-end;
  }
  .filter-editor__rule-text {
    white-space: normal;
  }
}
</style>
