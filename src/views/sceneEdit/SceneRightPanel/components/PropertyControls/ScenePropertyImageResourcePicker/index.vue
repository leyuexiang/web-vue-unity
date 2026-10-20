<template>
  <!--
    看板图片资源统一入口。
    资源市场选择和本地上传同时产出 OSS 编号与当前可用地址；本地文件必须先完成上传与资源登记。
    业务面板不会接触 File、Blob 或临时对象地址，保存使用编号，双运行时仅消费本次解析地址。
  -->
  <div class="scene-edit-image-resource-picker">
    <div v-if="model" class="scene-edit-image-resource-picker__preview">
      <button
        type="button"
        class="scene-edit-image-resource-picker__preview-button"
        title="从资源市场更换图片"
        :disabled="disabled"
        @click="openResourceMarket"
      >
        <img :src="model" alt="当前图片资源" />
      </button>
      <el-tooltip content="清除图片" placement="top">
        <button
          type="button"
          class="scene-edit-image-resource-picker__clear"
          aria-label="清除图片"
          :disabled="disabled"
          @click="clearImage"
        >
          <el-icon aria-hidden="true"><Delete /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <div class="scene-edit-image-resource-picker__actions">
      <ScenePropertyButton native-type="button" :disabled="disabled" @click="openResourceMarket">
        <template #icon
          ><el-icon><Picture /></el-icon
        ></template>
        资源市场
      </ScenePropertyButton>

      <!-- Element Plus 仅负责唤起系统文件选择器，实际传输和资源登记由 handleLocalUpload 串行完成。 -->
      <el-upload
        class="scene-edit-image-resource-picker__upload"
        :show-file-list="false"
        :http-request="handleLocalUpload"
        :before-upload="beforeLocalUpload"
        :disabled="disabled || uploading"
        accept="image/*"
      >
        <ScenePropertyButton native-type="button" :disabled="disabled || uploading">
          <template #icon
            ><el-icon><Upload /></el-icon
          ></template>
          {{ uploading ? '上传中' : '本地上传' }}
        </ScenePropertyButton>
      </el-upload>
    </div>

    <ScenePropertyDialog
      v-model="marketVisible"
      title="选择图片资源"
      :width="720"
      destroy-on-close
      @open="loadResourceMarket"
    >
      <div class="scene-edit-image-resource-market">
        <div class="scene-edit-image-resource-market__toolbar">
          <el-input
            v-model.trim="searchKeyword"
            placeholder="搜索图片资源"
            clearable
            :prefix-icon="Search"
            @clear="searchResources"
            @keyup.enter="searchResources"
          />
          <ScenePropertyButton
            native-type="button"
            :loading="marketLoading"
            aria-label="刷新图片资源"
            title="刷新图片资源"
            @click="loadResourceMarket"
          >
            <template #icon
              ><el-icon><Refresh /></el-icon
            ></template>
          </ScenePropertyButton>
        </div>

        <!--
          固定网格尺寸防止图片宽高差异导致弹窗布局跳动；列表只缓存轻量接口记录和运行时 URL，
          不把 HTMLImageElement 缓存在响应式状态中，关闭弹窗后浏览器可直接回收节点。
        -->
        <div v-loading="marketLoading" class="scene-edit-image-resource-market__content">
          <div v-if="resourceItems.length" class="scene-edit-image-resource-market__grid">
            <button
              v-for="item in resourceItems"
              :key="item.key"
              type="button"
              class="scene-edit-image-resource-market__card"
              :class="{ 'is-selected': item.resourceKey === resourceKey || item.url === model }"
              :title="item.name"
              @click="selectResource(item)"
            >
              <span class="scene-edit-image-resource-market__media">
                <img :src="item.url" :alt="item.name" loading="lazy" />
              </span>
              <span class="scene-edit-image-resource-market__name">{{ item.name }}</span>
              <span class="scene-edit-image-resource-market__category">{{ item.category }}</span>
            </button>
          </div>
          <el-empty v-else-if="!marketLoading" description="暂无图片资源" />
        </div>

        <el-pagination
          v-if="marketTotal > pageSize"
          v-model:current-page="marketPage"
          class="scene-edit-image-resource-market__pagination"
          :page-size="pageSize"
          :total="marketTotal"
          layout="prev, pager, next"
          @current-change="loadResourceMarket"
        />
      </div>

      <template #footer>
        <ScenePropertyButton native-type="button" @click="marketVisible = false">
          取消
        </ScenePropertyButton>
      </template>
    </ScenePropertyDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, type UploadRequestOptions } from 'element-plus'
import { Delete, Picture, Refresh, Search, Upload } from '@element-plus/icons-vue'
import ScenePropertyButton from '@/components/ScenePropertyButton/index.vue'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'
import { findIconTypeOfProjectIconType } from '@/servers/generated/dimensions/api/projectIconType'
import { addDim3dIcon, pageDim3dIcon, type Dim3dIconPageVo } from '@/servers/manual/dim3d/api/icon'
import { getDim3dOssFileById, uploadDim3dOssFile } from '@/servers/manual/dim3d/api/oss'
import { appLogger } from '@/utils/logger'

defineOptions({ name: 'ScenePropertyImageResourcePicker' })

const props = withDefaults(
  defineProps<{
    /** 禁用时仍展示当前资源缩略图，但禁止选择、上传和清除。 */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const model = defineModel<string>({ default: '' })
/**
 * 可选的稳定资源编号双向绑定。
 *
 * 旧的二维面板只关心图片地址，因此不传该绑定时仍保持原有 API；看板和需要进入四包资源依赖
 * 的新调用方同时绑定该字段，使地址只留在运行时，保存时使用 OSS 编号重新解析。
 */
const resourceKey = defineModel<string | undefined>('resourceKey')
const marketVisible = ref(false)
const marketLoading = ref(false)
const uploading = ref(false)
const searchKeyword = ref('')
const marketPage = ref(1)
const marketTotal = ref(0)
const marketRecords = ref<Dim3dIconPageVo[]>([])
/**
 * 图标分页只返回稳定的 OSS 文件编号，图片地址通过文件服务解析得到。
 * 当前选择器缓存已解析地址，翻页或刷新时不会重复请求同一文件；同一页内的重复编号还会复用进行中的 Promise。
 */
const iconUrlByFileId = ref(new Map<string, string>())
const iconUrlRequests = new Map<string, Promise<string>>()
/** 每页数量兼顾 720px 弹窗的四列网格与请求开销，翻页时不会重复拉取全部资源。 */
const pageSize = 20
/**
 * 用递增序号淘汰晚返回的旧查询。搜索、翻页和手动刷新可能并发，只有最后一次请求允许覆盖列表，
 * 从而避免慢网络下旧关键词结果闪回当前弹窗。
 */
let marketRequestSequence = 0

const normalizeText = (value: unknown): string => String(value ?? '').trim()

/**
 * 按 OSS 编号解析图片正式地址。
 * 文件服务失败时只跳过当前卡片，不让单个坏资源阻断其余图片；Promise 缓存同时避免并发重复查询。
 */
const resolveIconUrl = (fileId: string): Promise<string> => {
  const normalizedId = normalizeText(fileId)
  if (!normalizedId) return Promise.resolve('')

  const cachedUrl = iconUrlByFileId.value.get(normalizedId)
  if (cachedUrl) return Promise.resolve(cachedUrl)

  const cachedRequest = iconUrlRequests.get(normalizedId)
  if (cachedRequest) return cachedRequest

  const request = getDim3dOssFileById(normalizedId, {
    suppressNotFoundNotification: true,
  })
    .then((response) => {
      if (response?.code !== 200 || !Array.isArray(response.data)) return ''
      const file = response.data.find((item) => normalizeText(item.ossId) === normalizedId)
      return normalizeText(file?.url)
    })
    .catch((error) => {
      appLogger.error(
        'ScenePropertyImageResourcePicker',
        '解析图片资源地址失败',
        normalizedId,
        error,
      )
      return ''
    })
    .finally(() => {
      iconUrlRequests.delete(normalizedId)
    })

  iconUrlRequests.set(normalizedId, request)
  return request
}

/** 只解析当前分页中未缓存的文件编号，避免资源市场弹窗打开时产生无界请求。 */
const resolveMarketIconUrls = async (records: Dim3dIconPageVo[], requestSequence: number) => {
  const fileIds = [
    ...new Set(records.map((record) => normalizeText(record.iconFileId)).filter(Boolean)),
  ]
  if (!fileIds.length) return

  const results = await Promise.all(
    fileIds.map(async (fileId) => ({ fileId, url: await resolveIconUrl(fileId) })),
  )
  if (requestSequence !== marketRequestSequence) return

  const next = new Map(iconUrlByFileId.value)
  results.forEach(({ fileId, url }) => {
    if (url) next.set(fileId, url)
  })
  iconUrlByFileId.value = next
}

/**
 * 视图层只转换当前页记录，不复制图片二进制数据。没有有效地址的异常记录在此过滤，
 * 防止用户选中后把空字符串提交给看板并触发一次无意义的场景重绘。
 */
const resourceItems = computed(() =>
  marketRecords.value
    .map((record, index) => ({
      key: normalizeText(record.id) || normalizeText(record.iconFileId) || `icon-${index}`,
      name: normalizeText(record.iconName) || '未命名图片',
      category: normalizeText(record.categoryName) || normalizeText(record.category) || '默认分类',
      resourceKey: normalizeText(record.iconFileId),
      url: iconUrlByFileId.value.get(normalizeText(record.iconFileId)) || '',
    }))
    .filter((record) => Boolean(record.url)),
)

/** 打开弹窗后再请求资源，未使用图片选择功能时不占用接口与内存。 */
const openResourceMarket = () => {
  if (props.disabled) return
  marketVisible.value = true
}

/**
 * 查询参数与图片资源管理页保持一致，确保看板看到的就是编辑器资源市场中的同一批记录。
 * 新接口只返回图标元信息，地址解析完成后才展示卡片；请求失败时不回退到静态内置图片，避免
 * 把系统默认图误显示成后端资源。
 */
const loadResourceMarket = async () => {
  const requestSequence = ++marketRequestSequence
  marketLoading.value = true

  try {
    const response = await pageDim3dIcon({
      pageNum: marketPage.value,
      pageSize,
      iconName: searchKeyword.value || undefined,
    })
    if (requestSequence !== marketRequestSequence) return

    const records = response.rows ?? []
    marketRecords.value = records
    marketTotal.value = response.total ?? records.length
    await resolveMarketIconUrls(records, requestSequence)
  } catch (error) {
    if (requestSequence !== marketRequestSequence) return
    marketRecords.value = []
    marketTotal.value = 0
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    appLogger.error('ScenePropertyImageResourcePicker', '加载图片资源市场失败', normalizedError)
    ElMessage.error(normalizedError.message || '图片资源加载失败')
  } finally {
    if (requestSequence === marketRequestSequence) {
      marketLoading.value = false
    }
  }
}

/** 新搜索从第一页开始，防止旧页码超出新结果总页数而错误显示空列表。 */
const searchResources = () => {
  marketPage.value = 1
  void loadResourceMarket()
}

/**
 * 选择资源时同时写入“运行时地址”和“持久化编号”。地址用于当前画布即时刷新，编号用于四包
 * 保存和下一次加载；两者必须来自同一张资源卡片，不能让调用方自行拼接或猜测编号。
 */
const selectResource = (item: { resourceKey: string; url: string }) => {
  if (!item.url || !item.resourceKey || props.disabled) return
  /** 先发出编号，再发出地址；父级收到地址并提交命令时即可读取到同一资源的完整身份。 */
  resourceKey.value = item.resourceKey
  model.value = item.url
  marketVisible.value = false
}

const clearImage = () => {
  if (props.disabled) return
  /** 清理顺序与选择顺序一致，确保父级地址回调执行时不会残留旧资源编号。 */
  resourceKey.value = undefined
  model.value = ''
}

/** 本地上传沿用图片资源管理页的 image/* 与 4MB 限制，避免两个入口对同一市场采用不同规则。 */
const beforeLocalUpload = (rawFile: File) => {
  if (!rawFile.type.startsWith('image/')) {
    ElMessage.error('当前仅能上传图片资源')
    return false
  }
  if (rawFile.size / 1024 / 1024 >= 4) {
    ElMessage.error('图片大小需小于 4MB')
    return false
  }
  return true
}

/** 文件名转为资源名时去掉最后一个扩展名，并遵循资源管理页 50 字符上限。 */
const createResourceName = (fileName: string): string =>
  fileName
    .replace(/\.[^.]+$/, '')
    .trim()
    .slice(0, 50) || '看板图片'

/**
 * 本地文件必须按“读取分类 -> 上传 OSS -> 新图标接口登记 -> 写回看板”顺序执行。
 * 新接口以 `iconFileId` 作为稳定文件身份，不再向旧项目图标接口发送 `iconPath`、`typeId` 或平台来源字段；
 * 登记失败时保留原图片并记录 OSS 编号，避免把未登记的临时地址写入场景。对象清理由后端资源治理负责，
 * 前端不再调用旧 MinIO 删除接口。
 */
const handleLocalUpload = async (options: UploadRequestOptions) => {
  if (uploading.value) return
  uploading.value = true
  let uploadedFileId = ''

  try {
    const categoryResponse = await findIconTypeOfProjectIconType({ typeName: '' })
    const category = categoryResponse.data?.find((item) => normalizeText(item.typeCode))
    const categoryCode = normalizeText(category?.typeCode) || normalizeText(category?.id)
    if (categoryResponse.code !== 200 || !categoryCode) {
      throw new Error('请先在图片资源市场创建图片分类')
    }

    const uploadResponse = await uploadDim3dOssFile(options.file as File)
    const fileId = normalizeText(uploadResponse.data?.ossId)
    if (uploadResponse.code !== 200 || !fileId) {
      throw new Error(uploadResponse.msg || '图片上传失败')
    }
    uploadedFileId = fileId

    const registerResponse = await addDim3dIcon({
      iconName: createResourceName(options.file.name),
      category: categoryCode,
      resourceBelong: 'MINE',
      iconFileId: fileId,
    })
    if (registerResponse.code !== 200) {
      throw new Error(registerResponse.msg || '图片资源登记失败')
    }

    /** 上传接口返回的 URL 是可直接访问的正式地址；缺失时补查 OSS，绝不拼接存储桶路径。 */
    const uploadedUrl = normalizeText(uploadResponse.data?.url) || (await resolveIconUrl(fileId))
    if (!uploadedUrl) throw new Error('图片资源地址解析失败')

    /** 登记成功后同时写入地址和 OSS 编号，父级收到的始终是可再次查询的正式资源身份。 */
    /** 先同步编号，再触发地址更新，保证父级同一次命令快照同时包含两者。 */
    resourceKey.value = fileId
    model.value = uploadedUrl
    ElMessage.success('图片已上传到资源市场')
    options.onSuccess?.(registerResponse)

    /** 下次打开资源市场时重新加载第一页，让刚上传的图片可以立即被再次选择。 */
    marketPage.value = 1
    marketRecords.value = []
    marketTotal.value = 0
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error))

    appLogger.error(
      'ScenePropertyImageResourcePicker',
      '本地图片上传到资源市场失败',
      normalizedError,
      uploadedFileId,
    )
    ElMessage.error(normalizedError.message || '图片上传失败')
    options.onError?.(
      Object.assign(new Error(normalizedError.message), {
        name: 'UploadAjaxError',
        status: 0,
        method: options.method,
        url: options.action,
      }),
    )
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped lang="scss">
.scene-edit-image-resource-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.scene-edit-image-resource-picker__preview {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}
.scene-edit-image-resource-picker__preview-button {
  box-sizing: border-box;
  width: 52px;
  height: 52px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: #131c26;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 2px;
}
.scene-edit-image-resource-picker__preview-button:hover,
.scene-edit-image-resource-picker__preview-button:focus-visible {
  outline: none;
  border-color: var(--scene-edit-header-primary);
}
.scene-edit-image-resource-picker__preview-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.scene-edit-image-resource-picker__preview-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.scene-edit-image-resource-picker__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: rgb(255 255 255 / 60%);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
}
.scene-edit-image-resource-picker__clear:hover,
.scene-edit-image-resource-picker__clear:focus-visible {
  color: #e88b8b;
  outline: none;
  background: rgb(255 255 255 / 8%);
}
.scene-edit-image-resource-picker__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  min-width: 0;
}
.scene-edit-image-resource-picker__actions :deep(.scene-edit-property-button) {
  width: 100%;
  min-width: 0;
  margin: 0;
  border-radius: 2px;
  transform: none;
}
.scene-edit-image-resource-picker__upload,
.scene-edit-image-resource-picker__upload :deep(.el-upload) {
  display: block;
  width: 100%;
}
.scene-edit-image-resource-market {
  display: grid;
  grid-template-rows: auto minmax(280px, 1fr) auto;
  gap: 16px;
  min-width: 0;
}
.scene-edit-image-resource-market__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  gap: 8px;
  min-width: 0;
}
.scene-edit-image-resource-market__toolbar :deep(.scene-edit-property-button) {
  width: 32px;
  min-width: 32px;
  height: 32px;
  padding: 0;
  margin: 0;
  border-radius: 2px;
  transform: none;
}
.scene-edit-image-resource-market__content {
  min-height: 280px;
}
.scene-edit-image-resource-market__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.scene-edit-image-resource-market__card {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  min-width: 0;
  padding: 8px;
  color: var(--scene-edit-text);
  text-align: left;
  cursor: pointer;
  background: #131c26;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 2px;
}
.scene-edit-image-resource-market__card:hover,
.scene-edit-image-resource-market__card:focus-visible,
.scene-edit-image-resource-market__card.is-selected {
  outline: none;
  background: rgb(90 178 165 / 10%);
  border-color: var(--scene-edit-header-primary);
}
.scene-edit-image-resource-market__media {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #0e1720;
}
.scene-edit-image-resource-market__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.scene-edit-image-resource-market__name,
.scene-edit-image-resource-market__category {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scene-edit-image-resource-market__name {
  font-size: 12px;
  line-height: 18px;
}
.scene-edit-image-resource-market__category {
  font-size: 11px;
  line-height: 16px;
  color: var(--scene-edit-text-2);
}
.scene-edit-image-resource-market__pagination {
  justify-self: center;
}

@media (width <= 640px) {
  .scene-edit-image-resource-market__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
