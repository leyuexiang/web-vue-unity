import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authContext } from '@/auth/authContext'
import { getStandaloneProfile } from '@/auth/standalone'

/** 页面状态仅投影已完成认证的资料，不再调用历史服务发现或旧权限接口。 */
export const useAppStore = defineStore('appStore', () => {
  // 旧文件地址拼接器仍读取 minio；直接复用对象存储环境地址，不再向后端查询服务器地址。
  const pathPrefixInfo = ref({ minio: String(import.meta.env.VITE_DIM3D_AMM_SERVER_URL || '').replace(/\/+$/, '') })
  const userInfo = ref<{ user: { nickname: string }; roles: readonly string[]; permissions: readonly string[] }>()
  const platformType = ref<'tenant' | 'operation'>()
  const permissions = ref<readonly string[]>([])
  const roles = ref<readonly string[]>([])

  /** 每次认证变化都覆盖投影；退出后不能继续显示上一用户的昵称或权限。 */
  const syncAuthentication = () => {
    const context = authContext.get()
    const profile = getStandaloneProfile()
    platformType.value = context?.platformType
    permissions.value = context?.permissions ?? []
    roles.value = context?.roles ?? []
    userInfo.value = profile && context ? {
      user: { nickname: profile.user.nickName }, roles: roles.value, permissions: permissions.value,
    } : undefined
  }
  return { pathPrefixInfo, userInfo, platformType, permissions, roles, syncAuthentication }
})
