import { describe, expect, it } from 'vitest'
import { normalizePublicRequestName, resolvePublicRequestName } from '../publicRequestName'

describe('公共接口名称兼容', () => {
  it('优先使用当前协议的名称字段', () => {
    expect(resolvePublicRequestName({ name: '  当前接口  ', requestName: '旧接口' })).toBe(
      '当前接口',
    )
  })

  it('读取旧场景的请求名称并归一为当前名称字段', () => {
    expect(normalizePublicRequestName({ requestName: '历史接口' })).toEqual({
      requestName: '历史接口',
      name: '历史接口',
    })
  })
})
