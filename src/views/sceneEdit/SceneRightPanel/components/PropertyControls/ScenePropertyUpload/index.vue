<template>
  <!--
    属性面板共享单图上传控件。
    文件校验、MinIO 上传、预览和删除集中在此处，业务面板只持有最终图片地址。
  -->
  <div class="scene-edit-property-upload">
    <el-upload
      class="scene-edit-property-upload__uploader"
      :show-file-list="false"
      :http-request="handleUpload"
      :before-upload="beforeUpload"
      :disabled="disabled"
      accept="image/jpeg,image/jpg,image/png"
    >
      <div v-if="!model" class="scene-edit-property-upload__placeholder">
        <el-icon class="scene-edit-property-upload__add-icon" aria-hidden="true">
          <Plus />
        </el-icon>
      </div>
      <div v-else class="scene-edit-property-upload__preview">
        <img
          :src="model"
          class="scene-edit-property-upload__image"
          alt="已上传图片预览"
          @click.stop="handlePreview"
        />
        <div class="scene-edit-property-upload__actions">
          <button
            type="button"
            class="scene-edit-property-upload__action"
            aria-label="预览图片"
            @click.stop="handlePreview"
          >
            <el-icon :size="14" aria-hidden="true"><View /></el-icon>
          </button>
          <button
            type="button"
            class="scene-edit-property-upload__action"
            aria-label="删除图片"
            :disabled="disabled"
            @click.stop="handleDelete"
          >
            <el-icon :size="14" aria-hidden="true"><Delete /></el-icon>
          </button>
        </div>
      </div>
    </el-upload>

    <!-- 预览只展示当前模型地址，不复制图片数据，关闭后由对话框自动释放节点。 -->
    <ScenePropertyDialog v-model="previewVisible" :width="800">
      <img :src="model" class="scene-edit-property-upload__dialog-image" alt="上传图片大图预览" />
    </ScenePropertyDialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus, View } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'
import { fileOfMinio } from '@/servers/generated/dimensions/api/minio'
import { concatMinioUrl } from '@/utils/utils'
import { appLogger } from '@/utils/logger'

withDefaults(
  defineProps<{
    /** 禁用时保留预览能力，但阻止重新上传和删除，适用于只读属性面板。 */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 上传或删除成功后通知业务面板同步历史记录、运行时或序列化配置。 */
  (event: 'upload-value', url: string): void
  /** 上传异常继续向上透传，调用方可按业务需要补充监控或恢复动作。 */
  (event: 'upload-error', error: Error): void
}>()

const model = defineModel<string>({ default: '' })
const previewVisible = ref(false)

/** 上传前统一校验文件类型与大小，避免每个属性面板重复实现同一规则。 */
const beforeUpload = (rawFile: File) => {
  const isValidType = ['image/jpeg', 'image/jpg', 'image/png'].includes(rawFile.type)
  if (!isValidType) {
    ElMessage.error('只支持 JPG、JPEG、PNG 格式的图片!')
    return false
  }

  const isValidSize = rawFile.size / 1024 / 1024 <= 2
  if (!isValidSize) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }

  return true
}

/** 自定义上传沿用项目 MinIO 管理端接口，由全局拦截器注入当前登录令牌。 */
const handleUpload = async (options: UploadRequestOptions) => {
  try {
    const response = await fileOfMinio(
      { object: 'resBind' },
      {},
      options.file,
    )
    if (response.code !== 200 || !response.data) {
      throw new Error(response.code === 200 ? '上传响应格式错误' : '上传失败')
    }

    const url = concatMinioUrl(response.data)
    model.value = url
    emit('upload-value', url)
    ElMessage.success('上传成功!')
  } catch (error) {
    /** 同时记录日志和通知父组件，便于区分接口、鉴权或文件限制问题。 */
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    appLogger.error('ScenePropertyUpload', '上传失败', normalizedError)
    emit('upload-error', normalizedError)
    ElMessage.error('上传失败，请重试!')
  }
}

/** 打开覆盖式预览，不改变已保存的资源地址。 */
const handlePreview = () => {
  previewVisible.value = true
}

/** 删除只清空当前属性值；远端资源生命周期仍由既有资源服务管理。 */
const handleDelete = () => {
  model.value = ''
  emit('upload-value', '')
}
</script>

<style scoped lang="scss">
.scene-edit-property-upload {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
}
.scene-edit-property-upload__uploader {
  display: block;
  width: 44px;
  max-width: 100%;
  :deep(.el-upload) {
    position: relative;
    box-sizing: border-box;
    display: block;
    width: 44px;
    max-width: 100%;
    height: 44px;
    overflow: hidden;
    cursor: pointer;
    background: #131c26;
    border: 1px dashed rgb(255 255 255 / 20%);
    border-radius: 2px;
    transition:
      border-color 120ms ease-out,
      background-color 120ms ease-out;
    &:hover {
      background: rgb(90 178 165 / 8%);
      border-color: #5ab2a5;
    }
  }
}
.scene-edit-property-upload__placeholder,
.scene-edit-property-upload__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.scene-edit-property-upload__add-icon {
  font-size: 18px;
  color: rgb(255 255 255 / 50%);
}
.scene-edit-property-upload__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scene-edit-property-upload__actions {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 58%);
  opacity: 0;
  transition: opacity 120ms ease-out;
}
.scene-edit-property-upload__preview:hover .scene-edit-property-upload__actions,
.scene-edit-property-upload__preview:focus-within .scene-edit-property-upload__actions {
  opacity: 1;
}
.scene-edit-property-upload__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #ffffff;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 2px;
}
.scene-edit-property-upload__action:hover,
.scene-edit-property-upload__action:focus-visible {
  color: #5ab2a5;
  outline: none;
  background: rgb(255 255 255 / 10%);
}
.scene-edit-property-upload__action:disabled {
  color: rgb(255 255 255 / 35%);
  cursor: not-allowed;
  background: transparent;
}
.scene-edit-property-upload__dialog-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
  object-fit: contain;
}
</style>
