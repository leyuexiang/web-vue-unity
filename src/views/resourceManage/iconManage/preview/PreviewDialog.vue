<template>
  <!--
    图片预览沿用模型预览弹窗的标题、状态、信息栏和底部操作结构；
    中央展示区只渲染图片，不创建 Three.js 场景或交互提示，避免无效的渲染开销。
  -->
  <el-dialog
    class="manage-dialog image-preview-dialog"
    :model-value="visible"
    destroy-on-close
    width="640px"
    align-center
    append-to-body
    :z-index="2200"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="image-preview-dialog__top">
      <span class="image-preview-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="image-preview-dialog__close"
        aria-label="关闭预览"
        @click="close"
      >
        <el-icon><Close /></el-icon>
      </button>
    </div>

    <div class="image-preview-dialog__content">
      <div class="image-preview-dialog__stage">
        <span class="image-preview-dialog__status" :class="statusClass">
          <i class="image-preview-dialog__status-dot" aria-hidden="true" />
          {{ statusLabel }}
        </span>

        <!-- 图片始终等比包含于固定展示区，超大图片不撑开弹窗，小图片不被裁切。 -->
        <img
          v-if="path && !imageLoadFailed"
          class="image-preview-dialog__image"
          :src="path"
          :alt="previewImageAlt"
          @error="handleImageError"
        />
        <span v-else class="image-preview-dialog__empty">图片预览不可用</span>
      </div>

      <div class="image-preview-dialog__metadata">
        <template v-for="(item, index) in metadata" :key="item.label">
          <div class="image-preview-dialog__meta-item" :class="{ 'is-flexible': index >= 2 }">
            <span class="image-preview-dialog__meta-label">{{ item.label }}</span>
            <span class="image-preview-dialog__meta-value">{{ item.value }}</span>
          </div>
          <i
            v-if="index < metadata.length - 1"
            class="image-preview-dialog__meta-divider"
            aria-hidden="true"
          />
        </template>
      </div>

      <!-- 编辑能力由页面按平台与资源归属计算；租户端系统资源不挂载按钮及其空白操作区。 -->
      <div v-if="canEdit" class="image-preview-dialog__footer">
        <div class="image-preview-dialog__divider" />
        <el-button type="primary" @click="emit('edit')">编辑图片</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

interface PreviewRecord {
  name?: string
  iconName?: string
  category?: string
  resourceBelongName?: string
  resourceBelong?: string
  description?: string
  iconDesc?: string
  updateTime?: string
  status?: string
  statusLabel?: string
}

interface Props {
  path: string
  visible: boolean
  /** 与卡片共用同一份能力结果，禁止预览弹窗绕过租户端系统资源限制。 */
  canEdit: boolean
  record?: PreviewRecord
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  edit: []
}>()

const imageLoadFailed = ref(false)
const title = computed(() => `${props.record?.name || props.record?.iconName || '图片'}·预览`)
const previewImageAlt = computed(
  () => `${props.record?.name || props.record?.iconName || '图片'}预览`,
)
const statusLabel = computed(() => {
  if (props.record?.statusLabel && props.record.statusLabel !== '--')
    return props.record.statusLabel
  return props.record?.status === 'OFFLINE' ? '已下线' : '已上线'
})
const statusClass = computed(() =>
  props.record?.status === 'OFFLINE' ? 'is-offline' : 'is-online',
)

/** Figma 使用完整日期时间；统一格式避免浏览器语言或接口时间格式改变信息栏宽度。 */
const formatPreviewDateTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const metadata = computed(() => [
  { label: '图片分类', value: props.record?.category || '--' },
  {
    label: '图片归属',
    value:
      props.record?.resourceBelongName ||
      (props.record?.resourceBelong === 'MINE'
        ? '我的资源'
        : props.record?.resourceBelong === 'SYSTEM'
          ? '系统资源'
          : '--'),
  },
  { label: '图片描述', value: props.record?.iconDesc || props.record?.description || '--' },
  { label: '更新时间', value: formatPreviewDateTime(props.record?.updateTime) },
])

/** 每次切换图片地址都允许重新加载，失败时只切换为空状态，避免破损图片反复请求。 */
watch(
  () => props.path,
  () => {
    imageLoadFailed.value = false
  },
)

const close = () => emit('update:visible', false)
const handleImageError = () => {
  imageLoadFailed.value = true
}
</script>

<style scoped lang="scss">
/* 图片预览与模型预览共用 640px 弹窗壳体，避免两类资源的关闭、信息和操作位置不同。 */
:global(.image-preview-dialog.el-dialog) {
  width: min(640px, calc(100vw - 32px)) !important;
  max-height: min(800px, calc(100vh - 32px));
  margin: auto;
  overflow: hidden;
  background: var(--manage-color-elevated, #ffffff) !important;
  border: 0 !important;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgb(25 31 37 / 16%);
}

/* 与模型预览保持相同的深色主题层级，图片只替换画布内容，不改变弹窗壳体。 */
:global(html[data-manage-theme='dark'] .image-preview-dialog.el-dialog) {
  background: #1d2a35 !important;
}
:global(html[data-manage-theme='dark'] .image-preview-dialog__stage) {
  background: #131c26;
}
:global(.image-preview-dialog.el-dialog::before),
:global(.image-preview-dialog .el-dialog__header) {
  display: none;
}
:global(.image-preview-dialog .el-dialog__body) {
  max-height: min(800px, calc(100vh - 32px));
  padding: 0 !important;
  overflow: hidden auto;
}
.image-preview-dialog__top {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 8px 0 24px;
  border-bottom: 1px solid var(--manage-color-line, #e5e7eb);
}
.image-preview-dialog__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 16px;

  /* 遵循管理页全局去加粗规则；仅继承模型预览的空间与交互结构。 */
  font-weight: 400;
  line-height: 24px;
  color: var(--manage-color-text-primary, #1f2937);
  white-space: nowrap;
}
.image-preview-dialog__close {
  display: inline-flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 18px;
  color: var(--manage-color-text-secondary, #6b7280);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}
.image-preview-dialog__close:hover {
  color: var(--manage-color-text-primary, #1f2937);
  background: var(--manage-color-button-hover-surface, #f3f4f6);
}
.image-preview-dialog__content {
  box-sizing: border-box;
  min-width: 0;
  padding: 24px;
}
.image-preview-dialog__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 402px;
  overflow: hidden;
  background: var(--manage-color-input, #fafafa);
  border-radius: 8px;
}
.image-preview-dialog__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.image-preview-dialog__empty {
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: var(--manage-color-text-secondary, #6b7280);
}
.image-preview-dialog__status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  box-sizing: border-box;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 62px;
  height: 24px;
  padding: 2px 8px;
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  border: 1px solid transparent;
  border-radius: 8px;
}
.image-preview-dialog__status.is-online {
  color: #73c74f;
  background: #e6fcef;
  border-color: #e2f4d8;
}
.image-preview-dialog__status.is-offline {
  color: #f05b50;
  background: #fff1f0;
  border-color: #ffd8d5;
}
.image-preview-dialog__status-dot {
  flex: 0 0 4px;
  width: 4px;
  height: 4px;
  background: currentcolor;
  border-radius: 50%;
}
.image-preview-dialog__metadata {
  display: flex;
  gap: 12px;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  min-height: 57px;
  margin-top: 12px;
}
.image-preview-dialog__meta-item {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 100px;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  min-width: 0;
  padding: 8px;
}
.image-preview-dialog__meta-item.is-flexible {
  flex: 1 1 0;
}
.image-preview-dialog__meta-divider {
  flex: 0 0 1px;
  align-self: center;
  width: 1px;
  height: 30px;
  background: var(--manage-color-line, #e5e5e5);
}
.image-preview-dialog__meta-label {
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: var(--manage-color-text-tertiary, #999999);
}
.image-preview-dialog__meta-value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--manage-color-text-primary, #333333);
  white-space: nowrap;
}

/* 模型预览同样保留完整更新时间，固定信息栏的最后一列不截断日期。 */
.image-preview-dialog__meta-item:last-of-type .image-preview-dialog__meta-value {
  overflow: visible;
  text-overflow: clip;
}
.image-preview-dialog__footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-end;
  margin-top: 12px;
}
.image-preview-dialog__divider {
  width: 100%;
  height: 1px;
  background: var(--manage-color-line, #e5e7eb);
}
.image-preview-dialog__footer :deep(.el-button) {
  min-width: 88px;
  height: 32px;
  margin: 0;
  font-family: 'Source Han Sans SC', 'Noto Sans SC', sans-serif;
  font-weight: 400;
  border-radius: 4px;
}
.image-preview-dialog__footer :deep(.el-button--primary) {
  color: #ffffff;
  background: #51a195;
  border-color: #51a195;
}

@media (width <= 680px) {
  .image-preview-dialog__content {
    padding: 16px;
  }
  .image-preview-dialog__stage {
    height: min(402px, calc((100vw - 64px) * 0.679));
  }
  .image-preview-dialog__metadata {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
  }
  .image-preview-dialog__meta-item,
  .image-preview-dialog__meta-item.is-flexible {
    flex: none;
    width: auto;
    padding: 8px;
  }
  .image-preview-dialog__meta-divider {
    display: none;
  }
}
</style>
