import { afterEach, describe, expect, it, vi } from 'vitest'
import { authContext } from '@/auth/authContext'

const embeddedModeMock = vi.hoisted(() => vi.fn(() => false))
vi.mock('@/auth/runtime', () => ({ isEmbeddedMode: embeddedModeMock }))

import {
  assertEmbeddedDataRequestUrl,
  getEmbeddedDataRequestHeaders,
  getEmbeddedSceneId,
} from '../dataRequestSecurity'

describe('数据面板嵌入请求安全策略', () => {
  afterEach(() => {
    embeddedModeMock.mockReturnValue(false)
    authContext.clear()
    vi.unstubAllEnvs()
  })

  it('独立模式不追加运行时参数', () => {
    expect(getEmbeddedSceneId({ sceneId: 'scene-1' })).toBeNull()
    expect(getEmbeddedDataRequestHeaders()).toEqual({})
    expect(() => assertEmbeddedDataRequestUrl('https://external.example/api')).not.toThrow()
  })

  it('嵌入模式要求场景编号和鉴权上下文', () => {
    embeddedModeMock.mockReturnValue(true)
    expect(() => getEmbeddedSceneId()).toThrow('缺少当前场景编号')
    expect(() => getEmbeddedDataRequestHeaders()).toThrow('鉴权尚未完成')
  })

  it('嵌入模式生成标准鉴权请求头', () => {
    embeddedModeMock.mockReturnValue(true)
    authContext.set({
      accessToken: 'token-1',
      clientId: 'client-1',
      permissions: [],
      roles: [],
      platformType: 'tenant',
    })
    expect(getEmbeddedDataRequestHeaders()).toEqual({
      Authorization: 'Bearer token-1',
      ClientId: 'client-1',
    })
  })

  it('嵌入模式仅允许相对地址和精确来源白名单', () => {
    embeddedModeMock.mockReturnValue(true)
    vi.stubEnv('VITE_EMBED_DATA_API_ALLOWED_ORIGINS', 'https://data.example.com:8443/')
    expect(() => assertEmbeddedDataRequestUrl('/api/data')).not.toThrow()
    expect(() => assertEmbeddedDataRequestUrl('https://data.example.com:8443/api')).not.toThrow()
    expect(() => assertEmbeddedDataRequestUrl('https://data.example.com/api')).toThrow('未配置白名单')
    expect(() => assertEmbeddedDataRequestUrl('https://other.example.com/api')).toThrow('未配置白名单')
  })
})
