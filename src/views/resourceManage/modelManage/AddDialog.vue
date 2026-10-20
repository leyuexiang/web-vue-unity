<template>
  <el-dialog
    class="manage-dialog model-manage-dialog"
    :model-value="visible"
    width="640px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="$emit('update:visible', $event)"
    @closed="handelRest(ruleFormRef)"
  >
    <!--
      弹窗结构按 Figma 节点 2140:6054 / 2140:6540 还原：标题栏、表单主体和底部
      操作栏分成稳定的三段。align-center 让遮罩直接按视口居中承载弹窗，避免默认
      15vh 顶部间距把高弹窗推到视口外并触发遮罩层滚动条；超长内容只在表单主体滚动。
    -->
    <div class="model-dialog__top">
      <span class="model-dialog__title">{{ editRecord ? '编辑模型' : '新增模型' }}</span>
      <button
        type="button"
        class="model-dialog__close"
        aria-label="关闭弹窗"
        @click="handelCancel(ruleFormRef)"
      >
        <el-icon><Close /></el-icon>
      </button>
    </div>

    <div class="model-dialog__body">
      <el-form
        ref="ruleFormRef"
        class="model-dialog__form"
        :model="ruleForm"
        :rules="rules"
        label-width="0"
        label-position="top"
        :validate-on-rule-change="false"
      >
        <el-form-item prop="modelName" class="model-dialog__field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label"><i>*</i>模型名称：</label>
            <el-input
              v-model="ruleForm.modelName"
              class="model-dialog__control"
              clearable
              placeholder="请输入模型名称"
            />
          </div>
        </el-form-item>

        <el-form-item prop="modelDesc" class="model-dialog__field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label">模型描述：</label>
            <el-input
              v-model="ruleForm.modelDesc"
              class="model-dialog__control model-dialog__textarea"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="请输入模型描述"
            />
          </div>
        </el-form-item>

        <el-form-item prop="category" class="model-dialog__field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label"><i>*</i>模型分类：</label>
            <el-select
              v-model="ruleForm.category"
              class="model-dialog__control"
              popper-class="manage-dropdown-popper manage-select-popper"
              placeholder="请选择分类"
              :options="categories"
            />
          </div>
        </el-form-item>

        <el-form-item prop="resourceBelong" class="model-dialog__field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label"><i>*</i>模型归属：</label>
            <el-radio-group v-model="ruleForm.resourceBelong" class="model-dialog__radio-group">
              <el-radio
                v-for="option in resourceBelongOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-form-item>

        <!-- 租户端模型新增和编辑都不开放收费配置，接口边界统一按免费模型提交。 -->
        <div v-if="!isTenantResourceDialog" class="model-dialog__row model-dialog__row--payment">
          <el-form-item prop="isPaid" class="model-dialog__field model-dialog__field--half">
            <div class="model-dialog__field-content">
              <label class="model-dialog__label"><i>*</i>是否付费：</label>
              <el-select
                v-model="ruleForm.isPaid"
                class="model-dialog__control"
                popper-class="manage-dropdown-popper manage-select-popper"
                :options="paidFormOptions"
              />
            </div>
          </el-form-item>

          <el-form-item
            v-if="ruleForm.isPaid === 'PAID'"
            prop="price"
            class="model-dialog__field model-dialog__field--half"
          >
            <div class="model-dialog__field-content">
              <label class="model-dialog__label"><i>*</i>价格（元）：</label>
              <el-input
                v-model="ruleForm.price"
                class="model-dialog__control"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="请输入价格"
              />
            </div>
          </el-form-item>
        </div>

        <el-form-item prop="coverList" class="model-dialog__field model-dialog__cover-field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label">封面图片：</label>
            <el-upload
              ref="coverUploadRef"
              class="model-cover-upload"
              accept="image/png,image/jpeg,image/webp"
              :show-file-list="false"
              :auto-upload="true"
              :http-request="handleCoverUpload"
              :before-upload="beforeAvatarUpload"
              :disabled="coverUploading"
            >
              <div v-if="currentCover" class="model-cover-upload__preview">
                <img
                  :src="currentCover.url"
                  alt="模型封面"
                  class="model-cover-upload__image"
                  @click.stop="handlePictureCardPreview(currentCover)"
                />
                <span class="model-cover-upload__replace">更换</span>
              </div>
              <div v-else class="model-cover-upload__empty">
                <el-icon><Plus /></el-icon>
                <span>{{ coverUploading ? '上传中' : '上传图片' }}</span>
              </div>
            </el-upload>
            <p class="model-dialog__hint">注意:点击上传封面图片，支持jpg/png/webp,不超过5MB</p>
          </div>
        </el-form-item>

        <el-form-item prop="fileList" class="model-dialog__field model-dialog__file-field">
          <div class="model-dialog__field-content">
            <label class="model-dialog__label"><i>*</i>模型文件：</label>
            <el-upload
              ref="modelFileUploadRef"
              v-model:file-list="ruleForm.fileList"
              drag
              name="file"
              class="model-file-upload"
              accept=".zip"
              :action="DIM3D_UPLOAD_URL"
              :http-request="handleModelFileUpload"
              :disabled="modelFileUploading"
              :before-upload="beforeFileUpload"
              :show-file-list="false"
            >
              <div class="model-file-upload__content">
                <span class="model-file-upload__icon"
                  ><el-icon><UploadFilled /></el-icon
                ></span>
                <span class="model-file-upload__title">
                  {{ modelFileUploadTitle }}
                </span>
                <span
                  v-if="modelFileUploaded && !modelFileUploading"
                  class="model-file-upload__success"
                >
                  上传成功，可点击重新选择
                </span>
                <template v-else>
                  <span class="model-file-upload__tip">支持格式：单个 .zip 模型压缩包</span>
                  <span class="model-file-upload__tip">单个文件不超过2GB</span>
                </template>
              </div>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="model-dialog__footer">
        <el-button class="model-dialog__cancel" @click="handelCancel(ruleFormRef)">取消</el-button>
        <el-button
          class="model-dialog__save"
          type="primary"
          :loading="submitting"
          :disabled="modelFileUploading || submitting"
          @click="handleConfirm(ruleFormRef)"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="dialogVisible" class="manage-dialog model-image-preview-dialog">
    <img class="model-image-preview-dialog__image" :src="dialogImageUrl" alt="模型封面预览" />
  </el-dialog>
</template>

<script setup lang="ts">
import { Close, Plus, UploadFilled } from '@element-plus/icons-vue'
import {
  ElMessage,
  type FormInstance,
  type FormRules,
  type UploadFile,
  type UploadInstance,
  type UploadProps,
  type UploadRawFile,
  type UploadRequestOptions,
  type UploadUserFile,
} from 'element-plus'
import { to } from '@/utils/asyncHandler'
import {
  addDim3dModel,
  editDim3dModel,
  getDim3dModelInfo,
  type Dim3dModelForm,
} from '@/servers/manual/dim3d/api/model'
import { getDim3dOssFileById, uploadDim3dOssFile } from '@/servers/manual/dim3d/api/oss'
import { DIM3D_UPLOAD_URL, uploadConvertDim3dResource } from '@/servers/manual/dim3d/api/upload'
import type { TransferListItem } from './index.vue'
import { authContext } from '@/auth/authContext'
import { getResourceBelongOptions } from '../resourceScope'

interface RuleForm {
  modelName: string
  modelDesc: string
  category?: number
  resourceBelong: 'SYSTEM' | 'MINE'
  isPaid: 'FREE' | 'PAID'
  price?: number | string
  /** 封面上传接口返回的文件编号，提交给阶段三模型接口的 coverImageId。 */
  coverImageId?: string
  modelFileId?: string
  coverList: UploadUserFile[]
  fileList: UploadUserFile[]
}

type CoverFile = UploadFile & { url: string; response?: { data?: string } }
type UploadError = Parameters<NonNullable<UploadRequestOptions['onError']>>[0]
type ModelUploadRecord = TransferListItem & {
  coverImageId?: string
  modelFileId?: string
}

const props = defineProps({
  visible: { type: Boolean, default: false },
  editRecord: { type: Object as PropType<TransferListItem> },
  originCategories: { type: Array as PropType<DimensionsApi.ResourceType[]>, default: () => [] },
  categories: { type: Array as PropType<{ label: string; value: number }[]>, default: () => [] },
})
const emit = defineEmits(['update:visible', 'updateList'])

/** 租户端新增模型只能归属“我的资源”；平台类型来自已校验的内存鉴权上下文。 */
const isTenantPlatform = authContext.getPlatformType() === 'tenant'
const resourceBelongOptions = getResourceBelongOptions(authContext.getPlatformType())
const defaultResourceBelong: RuleForm['resourceBelong'] = isTenantPlatform ? 'MINE' : 'SYSTEM'

/** 提交前再次归一化，防止旧表单状态或外部回填绕过租户端隐藏选项。 */
const normalizeResourceBelong = (value?: RuleForm['resourceBelong']): RuleForm['resourceBelong'] =>
  isTenantPlatform ? 'MINE' : value || defaultResourceBelong

/** 租户端新增和编辑我的资源都不开放收费字段，运营端继续沿用完整收费配置。 */
const isTenantResourceDialog = isTenantPlatform

const ruleFormRef = ref<FormInstance>()
const coverUploadRef = ref<UploadInstance>()
const modelFileUploadRef = ref<UploadInstance>()
const modelFileUploading = ref(false)
const submitting = ref(false)
const ruleForm = reactive<RuleForm>({
  modelName: '',
  modelDesc: '',
  category: void 0,
  resourceBelong: defaultResourceBelong,
  isPaid: 'FREE',
  price: void 0,
  coverImageId: void 0,
  modelFileId: void 0,
  coverList: [],
  fileList: [],
})
const paidFormOptions = [
  { label: '免费', value: 'FREE' },
  { label: '付费', value: 'PAID' },
]
const rules = reactive<FormRules<RuleForm>>({
  modelName: [
    { required: true, message: '请输入模型名称', trigger: 'blur' },
    { min: 1, max: 50, message: '模型名称长度在 1 到 50 个字符之间', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择模型分类', trigger: 'change' }],
  resourceBelong: [{ required: true, message: '请选择模型归属', trigger: 'change' }],
  isPaid: [{ required: true, message: '请选择是否付费', trigger: 'change' }],
  price: [
    {
      validator: (_rule, value, callback) => {
        if (ruleForm.isPaid !== 'PAID') return callback()
        const price = Number(value)
        if (!Number.isFinite(price) || price < 0.01) return callback(new Error('请输入有效价格'))
        callback()
      },
      trigger: 'blur',
    },
  ],
  fileList: [{ required: true, message: '请上传模型文件', trigger: 'change' }],
})

const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const coverUploading = ref(false)

const currentCover = computed<CoverFile | undefined>(() => {
  const cover = ruleForm.coverList[0]
  if (!cover?.url) return undefined
  return cover as CoverFile
})

/**
 * 模型上传控件关闭了 Element Plus 默认文件列表，必须把已上传文件名直接渲染到拖拽区。
 * 这样上传成功、编辑回显和重新选择三种状态都能在同一个区域给出明确反馈。
 */
const modelFileUploaded = computed(() => Boolean(ruleForm.modelFileId && ruleForm.fileList.length))
const modelFileUploadTitle = computed(() => {
  if (modelFileUploading.value) return '模型转换处理中'
  const fileName = ruleForm.fileList[0]?.name?.trim()
  return (
    fileName || (ruleForm.modelFileId ? '模型文件已上传，点击可更换' : '点击上传或拖拽文件到此处')
  )
})

const getCategoryValue = (record: TransferListItem) => {
  const source = record as TransferListItem & {
    categoryName?: string
    typeCode?: string
    dictValue?: string
  }
  // 列表和详情可能分别返回分类名称、编码或字典值；按同一优先级逐项匹配，
  // 避免接口字段变化导致编辑弹窗显示“请选择分类”。
  const candidates = [source.category, source.categoryName, source.typeCode, source.dictValue]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  const matchedOrigin = props.originCategories.find((item) =>
    candidates.some(
      (candidate) =>
        candidate === String(item.id ?? '') ||
        candidate === String(item.typeCode ?? '').trim() ||
        candidate === item.typeName.trim(),
    ),
  )
  if (matchedOrigin?.id !== undefined) return matchedOrigin.id

  const matchedOption = props.categories.find((item) =>
    candidates.some((candidate) => candidate === item.label || candidate === String(item.value)),
  )
  return matchedOption?.value ?? void 0
}

const resetRuleForm = () => {
  Object.assign(ruleForm, {
    modelName: '',
    modelDesc: '',
    category: void 0,
    resourceBelong: defaultResourceBelong,
    isPaid: 'FREE',
    price: void 0,
    coverImageId: void 0,
    modelFileId: void 0,
    coverList: [],
    fileList: [],
  })
}

/**
 * 编辑记录只保存 coverImageId（对象存储编号），它不是可访问路径。
 * 列表已解析过封面时直接复用地址；否则按编号查询 OSS，并精确匹配返回的 ossId。
 * 查询失败时返回空串而非拼接猜测地址，表单仍可保留原编号完成其他字段的编辑。
 */
const resolveExistingCoverUrl = async (coverImageId: string, listedUrl: unknown) => {
  const normalizedListedUrl = String(listedUrl ?? '').trim()
  if (normalizedListedUrl) return normalizedListedUrl
  if (!coverImageId) return ''

  const [error, response] = await to(
    getDim3dOssFileById(coverImageId, { suppressNotFoundNotification: true }),
  )
  if (error) return ''
  return (
    response?.data?.find((file) => String(file.ossId ?? '').trim() === coverImageId)?.url?.trim() ||
    ''
  )
}

let editInitRequestId = 0

watch(
  [() => props.editRecord, () => props.visible, () => props.categories.length],
  async ([record, visible]) => {
    // 关闭弹窗时不重置业务表单；下次打开同一条记录仍需重新回填。
    if (!visible) return
    if (!record) {
      resetRuleForm()
      return
    }

    const requestId = ++editInitRequestId
    const legacyRecord = record as ModelUploadRecord & {
      bannerAddress?: string
      artResName?: string
    }
    // 列表记录可能没有 modelFileId；详情接口是编辑保存时保留原文件绑定的唯一可靠来源。
    let detail: Partial<ModelUploadRecord> | undefined
    const resourceId = String(record.resourceId ?? record.id ?? '').trim()
    if (resourceId && !resourceId.startsWith('resource-')) {
      const [error, response] = await to(getDim3dModelInfo(resourceId))
      if (!error && requestId === editInitRequestId && props.visible) {
        detail = response?.data as Partial<ModelUploadRecord> | undefined
      }
    }
    if (requestId !== editInitRequestId || !props.visible) return

    const source = { ...legacyRecord, ...(detail || {}) }
    const coverImageId = String(source.coverImageId || source.bannerAddress || '').trim()
    // coverImageId 是编号而不是 MinIO 路径；必须经 OSS 查询解析为真实 URL 后才可回显。
    const coverUrl = await resolveExistingCoverUrl(coverImageId, source.imgPath)
    if (requestId !== editInitRequestId || !props.visible) return
    const coverList =
      coverImageId && coverUrl
        ? [
            {
              name: 'coverImg',
              url: coverUrl,
              response: { data: coverImageId },
            },
          ]
        : []
    const paid = source.isPaid === 'PAID' || source.paymentLabel?.startsWith('¥')
    const modelFileId = String(source.modelFileId || '').trim()
    Object.assign(ruleForm, {
      modelName: source.modelName || source.name || '',
      modelDesc: source.modelDesc || (source.description === '--' ? '' : source.description) || '',
      category: getCategoryValue(source),
      resourceBelong: normalizeResourceBelong(source.resourceBelong),
      isPaid: paid ? 'PAID' : 'FREE',
      price: source.priceYuan,
      coverImageId: coverImageId || void 0,
      modelFileId: modelFileId || void 0,
      coverList,
      // 上传控件隐藏文件列表，但保留一个虚拟文件项用于通过必填校验和表达原文件已绑定。
      fileList: modelFileId
        ? [
            {
              name: source.artResName || '已上传模型文件',
              status: 'success',
              response: { data: modelFileId },
            },
          ]
        : [],
    })
  },
  { immediate: true },
)

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isImg = /^image\/(png|jpe?g|webp)$/.test(rawFile.type)
  if (!isImg) {
    ElMessage.error('当前仅能上传 png、jpg 或 webp 图片')
    return false
  }
  if (rawFile.size / 1024 / 1024 >= 5) {
    ElMessage.error('图片大小需小于 5MB')
    return false
  }
  return true
}

const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url || ''
  dialogVisible.value = true
}

const handleCoverUpload = async (options: UploadRequestOptions) => {
  coverUploading.value = true

  try {
    const uploadResponse = await uploadDim3dOssFile(options.file as File)
    const ossId = uploadResponse.data?.ossId
    if (uploadResponse.code !== 200 || ossId === undefined || ossId === null) {
      throw new Error(uploadResponse.msg || '新封面上传失败')
    }

    const uploadedOssId = String(ossId).trim()
    if (!uploadedOssId) throw new Error('封面上传成功但缺少 ossId')
    ruleForm.coverList = [
      {
        name: options.file.name,
        url: uploadResponse.data?.url || '',
        response: { data: uploadedOssId },
      },
    ]
    // 阶段三模型接口要求提交对象存储编号，不能把临时访问地址写入 coverImageId。
    ruleForm.coverImageId = uploadedOssId
    await nextTick()
    coverUploadRef.value?.clearFiles()
    ElMessage.success('封面上传成功')
    options.onSuccess?.(uploadResponse)
  } catch (error) {
    const err = error as Error
    ElMessage.error(err.message || '封面处理失败，请重试')
    const uploadError = Object.assign(new Error(err.message), {
      name: 'UploadAjaxError',
      status: 0,
      method: options.method,
      url: options.action,
    }) as UploadError
    options.onError?.(uploadError)
  } finally {
    coverUploading.value = false
  }
}

const getSuffix = (filename: string) => filename?.split('.').pop()?.toLowerCase()
const MAX_SIZE = 2 * 1024 * 1024 * 1024
const checkFile = (file: UploadRawFile) => {
  const oversize = file.size > MAX_SIZE
  const isSupported = getSuffix(file.name) === 'zip'
  if (!isSupported) return { success: false, msg: '仅支持 zip 模型压缩包' }
  if (oversize) return { success: false, msg: '文件大小不能超过 2GB' }
  return { success: true, msg: '校验通过' }
}

const beforeFileUpload: UploadProps['beforeUpload'] = async (file) => {
  const result = checkFile(file)
  if (!result.success) {
    ElMessage.error(`验证不通过：${result.msg}`)
    return false
  }
  return true
}

/** 将任意上传失败统一转换为 Element Plus 可识别的错误对象，避免错误状态阻塞下一次上传。 */
const createUploadError = (error: unknown, options: UploadRequestOptions): UploadError => {
  const message = error instanceof Error ? error.message : String(error || '模型上传失败')
  return Object.assign(new Error(message), {
    name: 'UploadAjaxError',
    status: 0,
    method: options.method,
    url: options.action,
  }) as UploadError
}

/**
 * 按阶段三补充契约上传模型压缩包：成功必须同时满足 code=200、data.id 非空、resourceType=MODEL。
 * 只保存字符串 id；上传失败或响应不完整时不允许进入模型新增/编辑请求。
 */
const handleModelFileUpload = async (options: UploadRequestOptions) => {
  if (modelFileUploading.value) {
    options.onError?.(createUploadError(new Error('模型文件正在上传，请稍候'), options))
    return
  }

  const previousFileId = ruleForm.modelFileId
  const previousFileList = [...ruleForm.fileList]
  modelFileUploading.value = true
  // 立即显示本次选择的文件名；失败时在 catch 中恢复原文件，避免界面与实际绑定编号不一致。
  ruleForm.fileList = [{ name: options.file.name, status: 'uploading' }]

  try {
    const response = await uploadConvertDim3dResource(options.file as File)
    const data = response.data
    const fileId = data?.id === undefined || data.id === null ? '' : String(data.id).trim()

    if (response.code !== 200) throw new Error(response.msg || '模型文件上传失败')
    if (!fileId) throw new Error('模型文件上传成功但缺少资源编号')
    if (data?.resourceType !== 'MODEL') throw new Error('上传文件不是模型资源')

    ruleForm.modelFileId = fileId
    // 自定义上传不会自动把成功结果写回隐藏列表，因此显式维护成功文件项，供模板展示文件名。
    ruleForm.fileList = [
      {
        name: options.file.name,
        status: 'success',
        response: { data: fileId },
      },
    ]
    ruleFormRef.value?.clearValidate('fileList')
    options.onSuccess?.(response)
    ElMessage.success('模型文件上传成功')
  } catch (error) {
    // 编辑模型替换文件失败时保留原编号，避免一次失败使原模型无法继续保存。
    ruleForm.modelFileId = previousFileId
    ruleForm.fileList = previousFileList
    modelFileUploadRef.value?.clearFiles()
    options.onError?.(createUploadError(error, options))
    ElMessage.error(error instanceof Error ? error.message : '模型文件上传失败')
  } finally {
    modelFileUploading.value = false
  }
}

/** 表单使用分类 id，阶段三模型接口使用分类编码；转换只依赖分类接口返回的数据。 */
const getCategoryCode = (categoryId?: number) =>
  props.originCategories.find((category) => category.id === categoryId)?.typeCode?.trim() || ''

const handleConfirm = async (formEl?: FormInstance) => {
  if (!formEl) return
  await formEl.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请填写完整信息')
      return
    }

    if (modelFileUploading.value) {
      ElMessage.warning('模型文件仍在上传，请稍候')
      return
    }

    const {
      modelName,
      modelDesc,
      category,
      resourceBelong,
      isPaid,
      price,
      coverImageId,
      modelFileId,
    } = ruleForm
    // 租户端不接受隐藏字段的旧状态或篡改值，新增和编辑都始终提交免费枚举。
    const normalizedIsPaid: RuleForm['isPaid'] = isTenantResourceDialog ? 'FREE' : isPaid
    const categoryCode = getCategoryCode(category)
    if (!categoryCode) {
      ElMessage.error('分类接口未返回有效分类编码')
      return
    }
    if (!modelFileId) {
      ElMessage.error('请先上传模型文件')
      return
    }

    const form: Dim3dModelForm = {
      modelName: modelName.trim(),
      modelDesc: modelDesc.trim() || void 0,
      category: categoryCode,
      resourceBelong: normalizeResourceBelong(resourceBelong),
      isPaid: normalizedIsPaid,
      price: normalizedIsPaid === 'PAID' ? Number(price) : void 0,
      coverImageId: coverImageId || void 0,
      modelFileId,
    }

    const resourceId = props.editRecord?.resourceId ?? props.editRecord?.id
    if (props.editRecord && (resourceId === undefined || resourceId === null)) {
      ElMessage.error('缺少模型编号，无法修改')
      return
    }

    submitting.value = true
    const [err] = await to(
      props.editRecord ? editDim3dModel(String(resourceId), form) : addDim3dModel(form),
    )
    submitting.value = false
    if (err) return

    ElMessage.success(props.editRecord ? '模型修改成功' : '模型新增成功')
    emit('updateList')
    handelCancel(formEl)
  })
}

const handelCancel = (formEl?: FormInstance) => {
  handelRest(formEl)
  emit('update:visible', false)
}

const handelRest = (formEl?: FormInstance) => {
  coverUploading.value = false
  modelFileUploading.value = false
  coverUploadRef.value?.clearFiles()
  modelFileUploadRef.value?.clearFiles()
  formEl?.resetFields()
}
</script>

<style scoped lang="scss">
/* 弹窗视觉变量只在当前组件覆盖，避免影响资源管理页其他 Element Plus 控件。 */
:global(.model-manage-dialog.el-dialog) {
  width: 640px !important;
  max-width: calc(100vw - 32px);
  max-height: 800px;
  padding: 0;
  overflow: hidden;
  background: var(--manage-color-panel, #ffffff);
  border: 0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}
:global(.model-manage-dialog .el-dialog__header) {
  display: none;
}
:global(.model-manage-dialog .el-dialog__footer) {
  /* Element Plus 默认底栏承载区不能隐藏，否则内部按钮会变成 0×0。 */
  display: block;
  padding: 0 !important;
}
:global(.model-manage-dialog .el-dialog__body) {
  padding: 0 !important;
  color: var(--manage-color-text-primary, #595959);
}
.model-dialog__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 24px;
  border-bottom: 1px solid var(--manage-color-line, #e5e5e5);
}
.model-dialog__title,
.model-dialog__label,
.model-dialog__control,
.model-dialog__hint,
.model-dialog__radio-group,
.model-file-upload__content {
  font-family: 'Source Han Sans SC', sans-serif;
  letter-spacing: 0;
}
.model-dialog__title {
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  color: var(--manage-text, rgb(0 0 0 / 85%));
}
.model-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  color: var(--manage-text-2, rgb(0 0 0 / 45%));
  cursor: pointer;
  background: transparent;
  border: 0;
}
.model-dialog__body {
  max-height: 631px;
  padding: 24px 24px 0;
  overflow-y: auto;

  /* 新增与编辑模型弹窗按 Figma 使用 #b4d5d1 滑块，覆盖浏览器默认灰色。 */
  scrollbar-color: var(--manage-color-dialog-scrollbar-thumb, #b4d5d1) transparent;
  scrollbar-width: thin;
}
.model-dialog__body::-webkit-scrollbar {
  width: 5px;
}
.model-dialog__body::-webkit-scrollbar-thumb {
  background: var(--manage-color-dialog-scrollbar-thumb, #b4d5d1);
  border-radius: 4px;
}
.model-dialog__body::-webkit-scrollbar-track {
  background: transparent;
}
.model-dialog__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.model-dialog__field,
.model-dialog__field-content {
  width: 100%;
}
.model-dialog__field :deep(.el-form-item__content) {
  display: block;
  line-height: normal;
}
.model-dialog__field :deep(.el-form-item__error) {
  position: static;
  padding-top: 4px;
  line-height: 16px;
}
.model-dialog__label {
  display: block;
  height: 22px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: var(--manage-text-2, #595959);
}
.model-dialog__label i {
  margin-right: 0;
  font-style: normal;
  color: #ed7b2f;
}
.model-dialog__control {
  width: 100%;
}
.model-dialog__control :deep(.el-input__wrapper),
.model-dialog__control :deep(.el-select__wrapper) {
  height: 32px;
  min-height: 32px;
  padding: 0 16px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px var(--manage-color-line-component, #d9d9d9) !important;
}
.model-dialog__textarea :deep(.el-textarea__inner) {
  min-height: 90px !important;
  padding: 5px 16px;
  resize: none;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px var(--manage-color-line-component, #d9d9d9) !important;
}
.model-dialog__row {
  display: flex;
  gap: 16px;
  width: 100%;
}
.model-dialog__row--payment {
  gap: 16px;
}
.model-dialog__field--half {
  flex: 1 1 0;
  min-width: 0;
}
.model-dialog__radio-group {
  display: flex;
  gap: 24px;
  align-items: center;
  height: 22px;
}
.model-dialog__radio-group :deep(.el-radio) {
  height: 22px;
  margin-right: 0;
}
.model-dialog__radio-group :deep(.el-radio__label) {
  padding-left: 8px;
  font-size: 14px;
  color: var(--manage-text, #333333);
}
.model-dialog__radio-group :deep(.el-radio__inner) {
  width: 16px;
  height: 16px;
  border-color: #b8b9bb;
}
.model-dialog__radio-group :deep(.el-radio__input.is-checked .el-radio__inner) {
  background: transparent;
  border-color: var(--manage-accent, #51a195);
}
.model-dialog__radio-group :deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 8px;
  height: 8px;
  background: var(--manage-accent, #51a195);
}
.model-cover-upload {
  width: 72px;
  height: 72px;
}
.model-cover-upload :deep(.el-upload) {
  width: 72px;
  height: 72px;
  border: 0;
}
.model-cover-upload__empty,
.model-cover-upload__preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  overflow: hidden;
  color: var(--manage-accent, #51a195);
  background: var(--manage-color-upload-surface, #fafafa);
  border: 1px solid var(--manage-color-upload-border, #d9d9d9);
  border-radius: 8px;
}
.model-cover-upload__empty :deep(.el-icon) {
  margin-bottom: 3px;
  font-size: 14px;
  color: #cfcfcf;
}
.model-cover-upload__empty span,
.model-cover-upload__replace {
  font-size: 12px;
  line-height: 20px;
}
.model-cover-upload__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.model-cover-upload__replace {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  color: #ffffff;
  text-align: center;
  background: rgb(0 0 0 / 45%);
}
.model-dialog__hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 22px;
  color: var(--manage-text-3, #b8b9bb);
}
.model-file-upload,
.model-file-upload :deep(.el-upload),
.model-file-upload :deep(.el-upload-dragger) {
  width: 100%;
  height: 172px;
}
.model-file-upload :deep(.el-upload-dragger) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  background: var(--manage-color-upload-surface, #f6f8f9);
  border: 1px solid var(--manage-color-upload-border, #d9d9d9);
  border-radius: 8px;
}
.model-file-upload__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 395px;
  height: 124px;
}
.model-file-upload__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  font-size: 24px;
  color: var(--manage-accent, #51a195);
  background: rgb(81 161 149 / 10%);
  border-radius: 50%;
}
.model-file-upload__title {
  display: block;
  width: 395px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  line-height: 24px;
  color: var(--manage-text, #333333);
  white-space: nowrap;
}
.model-file-upload__success {
  display: block;
  width: 395px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 22px;
  color: var(--manage-accent, #51a195);
  white-space: nowrap;
}
.model-file-upload__tip {
  display: block;
  width: 395px;
  font-size: 12px;
  line-height: 22px;
  color: var(--manage-text-3, #b8b9bb);
}
.model-file-upload__title + .model-file-upload__tip,
.model-file-upload__title + .model-file-upload__success {
  margin-top: 4px;
}
.model-dialog__footer {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  min-height: 73px;
  padding-top: 16px;
  margin: 24px 24px 0;
  border-top: 1px solid var(--manage-color-line, #e5e5e5);
}
.model-dialog__footer .el-button {
  width: 65px;
  height: 32px;
  padding: 0;
  margin: 0;
  font-family: 'Source Han Sans SC', sans-serif;
  font-size: 14px;
  line-height: 22px;
  border-radius: 4px;
}
.model-dialog__cancel {
  color: var(--manage-accent, #51a195) !important;
  background: transparent !important;
  border-color: var(--manage-accent, #51a195) !important;
}
.model-dialog__save {
  color: #ffffff !important;
  background: var(--manage-accent, #51a195) !important;
  border-color: var(--manage-accent, #51a195) !important;
}
.model-image-preview-dialog__image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
}

@media (width <= 680px) {
  :global(.model-manage-dialog.el-dialog) {
    max-height: calc(100vh - 32px);
  }
  .model-dialog__row--payment {
    flex-direction: column;
    gap: 16px;
  }
  .model-dialog__body {
    max-height: calc(100vh - 104px);
  }
}
</style>
