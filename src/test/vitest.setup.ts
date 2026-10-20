import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { sessionStore } from '@/utils/webStorage'

// 只供单元测试使用。请求拦截器依赖应用已经完成登录，使用固定假令牌可阻止测试误触登录跳转，
// 同时不会向真实服务提供有效凭据。字符串必须与鉴权持久化协议中的键保持一致。
const TEST_ACCESS_TOKEN_KEY = 'accessToken'
const TEST_ACCESS_TOKEN = 'vitest-access-token'

beforeEach(() => {
  // 每个用例创建独立状态容器，既满足组件外使用Store的约束，也避免状态跨用例污染。
  setActivePinia(createPinia())
  // 某些异步请求会在用例断言后才进入拦截器，因此不在afterEach删除令牌；
  // 下一用例仍会覆盖为同一个无权限测试值，测试进程结束后内存存储自动释放。
  sessionStore.set(TEST_ACCESS_TOKEN_KEY, TEST_ACCESS_TOKEN)
})
