import { shallowRef, watch } from 'vue'
import { getDim3dOssFileById } from '@/servers/manual/dim3d/api/oss'
import type { ImageOption } from './config'
import { isImageSourceUrl } from './imageSource'

/** 地址解析只依赖资源字段，允许其它图片槽位复用，而无需传入形状和布局配置。 */
type ImageSourceOption = Pick<ImageOption, 'sourceType' | 'value' | 'resourceKey'>

/** 有界地址缓存供图片实例共享，避免同一编号在多个部件或轮询中重复请求。 */
const IMAGE_URL_CACHE_LIMIT = 128
const imageUrls = new Map<string, string>()
const pendingImageUrls = new Map<string, Promise<string>>()

/**
 * 复用市场选择器的对象存储查询协议；仅缓存成功结果，失败后允许重试。
 * 并发解析相同编号时复用同一请求，完成后立即释放请求引用。
 */
const resolveImageUrl = (resourceKey: string): Promise<string> => {
  const cached = imageUrls.get(resourceKey)
  if (cached) return Promise.resolve(cached)
  const pending = pendingImageUrls.get(resourceKey)
  if (pending) return pending

  const request = getDim3dOssFileById(resourceKey, { suppressNotFoundNotification: true })
    .then((response) => {
      if (response.code !== 200 || !Array.isArray(response.data)) return ''
      const url =
        response.data.find((file) => String(file.ossId) === resourceKey)?.url?.trim() || ''
      if (url) {
        if (imageUrls.size >= IMAGE_URL_CACHE_LIMIT) {
          const oldestKey = imageUrls.keys().next().value
          if (oldestKey !== undefined) imageUrls.delete(oldestKey)
        }
        imageUrls.set(resourceKey, url)
      }
      return url
    })
    // 解析失败显示空图片，避免错误编号继续展示上一张图；后续切换可重新查询。
    .catch(() => '')
    .finally(() => pendingImageUrls.delete(resourceKey))
  pendingImageUrls.set(resourceKey, request)
  return request
}

/**
 * 图片地址只属于呈现状态，不回写 option 或 dataConfig，保持市场编号持久化协议。
 * 监听三个标量，避免深度监听完整组件配置；切换图片或组件卸载后，清理回调使旧请求失效。
 * @param getOption 当前编辑态或预览态的图片配置读取入口。
 * @returns 图片组件实际消费的地址。
 */
export const useImageSource = (getOption: () => ImageSourceOption) => {
  const source = shallowRef('')
  watch(
    () => {
      const option = getOption()
      return [option.sourceType, option.value, option.resourceKey] as const
    },
    async ([sourceType, value, resourceKey], _, onCleanup) => {
      let active = true
      onCleanup(() => {
        active = false
      })
      const text = String(value ?? '').trim()
      if (sourceType !== 'resource-market' || isImageSourceUrl(text)) {
        source.value = text
        return
      }
      const key = text || String(resourceKey ?? '').trim()
      source.value = ''
      if (!key) return
      const url = await resolveImageUrl(key)
      if (active) source.value = url
    },
    { immediate: true },
  )
  return source
}
