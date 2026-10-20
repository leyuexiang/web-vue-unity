import { useAppStore } from '@/stores/appStore'
import { loginPublicPreviewGuest } from '@/servers/manual/dataMiddleware/api/auth'
import { authContext } from '@/auth/authContext'
import { appLogger } from '@/utils/logger'

/**
 * @description 根据搜索值过滤数据列表，返回包含匹配项的分类
 * @param searchValue 搜索值
 * @param dataList 数据列表
 * @returns 过滤后的数据列表
 */
export function filterDataList<
  T extends {
    name: string
    children?: Array<{ name: string; [key: string]: unknown }>
  },
>(searchValue: string, dataList: T[]): T[] {
  if (!searchValue.trim()) {
    return dataList
  }

  return dataList
    .filter((item) => {
      // 检查分类名称是否匹配
      if (item.name.toLowerCase().includes(searchValue.toLowerCase())) {
        return true
      }

      // 检查子项中是否有匹配的
      if (item.children && item.children.length > 0) {
        const hasMatchingChildren = item.children.some((child) =>
          child.name.toLowerCase().includes(searchValue.toLowerCase()),
        )
        if (hasMatchingChildren) {
          return true
        }
      }

      return false
    })
    .map((item) => {
      // 如果分类本身匹配，返回完整分类
      if (item.name.toLowerCase().includes(searchValue.toLowerCase())) {
        return item
      }

      // 如果只有子项匹配，返回过滤后的分类
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children.filter((child) =>
          child.name.toLowerCase().includes(searchValue.toLowerCase()),
        )
        return {
          ...item,
          children: filteredChildren,
        }
      }

      return item
    })
}

/**
 * @description 模糊搜索场景内容
 * @param searchText 搜索文本
 * @param contents 场景内容列表，如果不提供则自动获取
 * @returns 匹配的内容列表
 */
export const searchSceneContents = (
  searchText: string,
  contents?: Array<{
    name: string
    uuid: string
    userData: Record<string, unknown>
    visible: boolean
  }>,
): Array<{
  name: string
  uuid: string
  userData: Record<string, unknown>
  visible: boolean
}> => {
  // 如果没有提供内容列表，则获取所有场景内容
  const allContents = contents || []

  // 如果搜索文本为空，返回所有内容
  if (!searchText.trim()) {
    return allContents
  }

  const searchLower = searchText.toLowerCase().trim()

  return allContents.filter((content) => {
    const nameLower = content.name.toLowerCase()

    // 支持多种匹配方式：
    // 1. 完全匹配
    // 2. 开头匹配
    // 3. 包含匹配
    // 4. 拼音首字母匹配（简单实现）
    return (
      nameLower === searchLower ||
      nameLower.startsWith(searchLower) ||
      nameLower.includes(searchLower) ||
      // 简单的拼音首字母匹配
      getPinyinInitials(content.name).toLowerCase().includes(searchLower)
    )
  })
}

/**
 * @description 获取中文拼音首字母（简单实现）
 * @param text 文本
 * @returns 拼音首字母
 */
const getPinyinInitials = (text: string): string => {
  // 简单的拼音首字母映射表
  const pinyinMap: Record<string, string> = {
    一: 'y',
    二: 'e',
    三: 's',
    四: 's',
    五: 'w',
    六: 'l',
    七: 'q',
    八: 'b',
    九: 'j',
    十: 's',
    房: 'f',
    子: 'z',
    楼: 'l',
    层: 'c',
    门: 'm',
    窗: 'c',
    墙: 'q',
    地: 'd',
    天: 't',
    花: 'h',
    树: 's',
    草: 'c',
    石: 's',
    水: 's',
    火: 'h',
    金: 'j',
    木: 'm',
    土: 't',
    山: 's',
    海: 'h',
    车: 'c',
    船: 'c',
    飞: 'f',
    机: 'j',
    人: 'r',
    物: 'w',
    体: 't',
    球: 'q',
    方: 'f',
    圆: 'y',
    长: 'c',
    短: 'd',
    高: 'g',
    低: 'd',
    大: 'd',
    小: 'x',
    新: 'x',
    旧: 'j',
    好: 'h',
    坏: 'h',
  }

  return text
    .split('')
    .map((char) => {
      return pinyinMap[char] || char
    })
    .join('')
}

/**
 * @description 拼接 minIO 文件地址
 * @param url 文件地址
 * @returns 文件地址
 */
export function concatMinioUrl(url: string) {
  if (!url) return ''
  const { pathPrefixInfo } = useAppStore()
  const prefix = `${pathPrefixInfo?.minio || ''}/9tyf/`
  try {
    // 检查是否已经是编码过的URL
    const decodedUrl = decodeURIComponent(url)
    if (decodedUrl === url) {
      // 如果URL未编码，对整个路径进行编码
      const encodedUrl = url
        .split('/')
        .map((segment) => {
          if (!segment.trim()) return ''
          // 对每个字符进行检查，如果不是英文字母或数字，就进行编码
          return segment
            .split('')
            .map((char) => {
              // 仅保留基本的英文字母和数字，其他所有字符都编码
              // 包括括号()[]{}、连字符-、下划线_、点.等所有特殊字符
              if (/^[a-z0-9]$/i.test(char)) {
                return char
              }
              // 使用 encodeURIComponent 确保所有特殊字符都被编码
              const encoded = encodeURIComponent(char)
              // 某些特殊字符可能需要额外编码
              return encoded
                .replace(/\(/g, '%28')
                .replace(/\)/g, '%29')
                .replace(/\[/g, '%5B')
                .replace(/\]/g, '%5D')
                .replace(/\{/g, '%7B')
                .replace(/\}/g, '%7D')
            })
            .join('')
        })
        .filter(Boolean)
        .join('/')
      return `${prefix}${encodedUrl}`
    }
    // 如果URL已经编码，直接使用
    return `${prefix}${url}`
  } catch {
    // 如果解码过程出错，返回原始拼接
    return `${prefix}${url}`
  }
}

/**
 * @description 通过文件 URL 获取文件后缀名
 * @param url 文件 URL
 * @returns 文件后缀名（不包含点号），如果无法获取则返回空字符串
 * @example
 * getFileExtension('v1.0.0/web/jtyf1/CF01_daoju_01_a6f2b5208-5992-4d7c-8533-7c95ab8c4e6c/CF01_daoju_01_a.gltf')
 * // 返回: 'gltf'
 */
export function getFileExtension(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  try {
    // 移除 URL 中的查询参数和锚点
    const cleanUrl = url.split('?')[0].split('#')[0]

    // 获取最后一个点号后的内容
    const lastDotIndex = cleanUrl.lastIndexOf('.')

    if (lastDotIndex === -1 || lastDotIndex === cleanUrl.length - 1) {
      return ''
    }

    // 提取后缀名并转换为小写
    const extension = cleanUrl.substring(lastDotIndex + 1).toLowerCase()

    // 确保后缀名只包含字母和数字
    if (/^[a-z0-9]+$/i.test(extension)) {
      return extension
    }

    return ''
  } catch (error) {
    // 文件后缀解析失败时返回空字符串，日志保留原始 URL 便于定位异常路径格式。
    appLogger.error('Utils', '获取文件后缀名失败', url, error)
    return ''
  }
}
/**
 * @description 获取 token
 * @returns token
 */

export const tokenCache = async () => {
  const phonenumber = String(import.meta.env.VITE_PUBLIC_PREVIEW_GUEST_PHONENUMBER || '').trim()
  const password = String(import.meta.env.VITE_PUBLIC_PREVIEW_GUEST_PASSWORD || '')
  // 公开访问固定使用租户端游客应用编号，不能复用宿主上下文，避免运营端或其他应用编号污染登录。
  const loginClientId = String(import.meta.env.VITE_PUBLIC_PREVIEW_GUEST_CLIENT_ID || '').trim()
  if (!phonenumber || !password || !loginClientId) {
    throw new Error('公开访问游客登录参数未配置完整，请检查环境变量。')
  }
  let res
  try {
    res = await loginPublicPreviewGuest({
      clientId: loginClientId,
      accountType: 2,
      phonenumber,
      password,
      grantType: 'password',
    })
  } catch (error) {
    // 游客登录失败属于公开预览内部错误，抹除底层 401 状态，避免页面误跳到可见的用户登录界面。
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`公开访问游客自动登录失败：${message}`)
  }
  const accessToken = String(res.data?.access_token || '').replace(/^Bearer\s+/i, '').trim()
  const clientId = String(res.data?.client_id || '').trim()
  if (!accessToken || !clientId) {
    throw new Error(res.msg || '公开访问游客登录失败：接口未返回完整鉴权信息。')
  }
  // 游客登录结果只进入内存鉴权上下文，不写回场景配置或浏览器存储。
  authContext.set({
    accessToken,
    clientId,
    permissions: [],
    roles: [],
    // 游客通过租户登录接口获取，后续第一方请求必须沿用租户平台路径语义。
    platformType: 'tenant',
    ...(res.data?.expire_in
      ? { expiresAt: Date.now() + Number(res.data.expire_in) * 1000 }
      : {}),
  })
  return `Bearer ${accessToken}`
}

/**
 * @description 校验JSON字符串是否符合 {x:number, y:number, z:number} 格式
 * @param jsonString 需要校验的JSON字符串
 * @returns 校验结果对象，包含是否有效和解析后的数据
 * @example

 */
export function validateXYZFormat(jsonString: string): {
  isValid: boolean
  data: { x: number; y: number; z: number } | null
  error?: string
} {
  // 参数校验
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      isValid: false,
      data: null,
      error: '输入参数必须是非空字符串',
    }
  }
  try {
    // 尝试解析JSON
    const parsed = JSON.parse(jsonString)

    // 检查是否为对象
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        isValid: false,
        data: null,
        error: 'JSON数据必须是对象格式',
      }
    }

    // 检查必需的属性
    const requiredKeys = ['x', 'y', 'z']
    const missingKeys = requiredKeys.filter((key) => !(key in parsed))

    if (missingKeys.length > 0) {
      return {
        isValid: false,
        data: null,
        error: `缺少必需的属性: ${missingKeys.join(', ')}`,
      }
    }

    // 检查属性值是否为数字
    const invalidKeys = requiredKeys.filter((key) => {
      const value = parsed[key]
      return typeof value !== 'number' || isNaN(value) || !isFinite(value)
    })

    if (invalidKeys.length > 0) {
      return {
        isValid: false,
        data: null,
        error: `以下属性的值必须是有效数字: ${invalidKeys.join(', ')}`,
      }
    }

    // 检查是否包含额外的属性（可选，根据需求决定是否严格）
    const extraKeys = Object.keys(parsed).filter((key) => !requiredKeys.includes(key))
    if (extraKeys.length > 0) {
      return {
        isValid: false,
        data: null,
        error: `包含额外的属性: ${extraKeys.join(', ')}，只允许x、y、z属性`,
      }
    }

    // 校验通过，返回数据
    return {
      isValid: true,
      data: {
        x: parsed.x,
        y: parsed.y,
        z: parsed.z,
      },
    }
  } catch (error) {
    return {
      isValid: false,
      data: null,
      error: `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

/**
 * @description 校验JSON字符串是否符合布尔值格式
 * @param jsonString 需要校验的JSON字符串
 * @returns 校验结果对象，包含是否有效和解析后的数据
 * @example
 */
export function validateBooleanFormat(jsonString: string): {
  isValid: boolean
  data: boolean | null
  error?: string
} {
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      isValid: false,
      data: null,
      error: '输入参数必须是非空字符串',
    }
  }
  try {
    const parsed = JSON.parse(jsonString)
    return {
      isValid: true,
      data: parsed,
    }
  } catch (error) {
    return {
      isValid: false,
      data: null,
      error: `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

/**
 * @description 简化版本的XYZ格式校验，只返回布尔值
 * @param jsonString 需要校验的JSON字符串
 * @returns 是否符合格式要求
 * @example
 */
export function isValidXYZFormat(jsonString: string): boolean {
  return validateXYZFormat(jsonString).isValid
}
/**
 * @description 将图片URL转换为图片对象
 * @param url 图片URL
 * @returns 图片对象
 */
export const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // 支持跨域图片
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}
