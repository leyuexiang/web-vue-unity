import type { LegacyUnityTransport } from './LegacyUnityTransport'

/** An open SCTP channel can precede Unity's receiver binding; wait for its explicit handshake. */
export const waitForCloudRuntimeReady = (
  transport: Pick<LegacyUnityTransport, 'onSnapshot'>,
  timeoutMs = 90000,
): Promise<void> => new Promise((resolve, reject) => {
  let unsubscribe: (() => void) | undefined
  let settled = false
  const finish = (error?: Error) => {
    if (settled) return
    settled = true
    window.clearTimeout(timer)
    unsubscribe?.()
    if (error) reject(error)
    else resolve()
  }
  const timer = window.setTimeout(() => finish(new Error('Unity 云渲染 Runtime 就绪握手超时，请检查播放器是否包含 CloudRpcDataChannel')), timeoutMs)
  unsubscribe = transport.onSnapshot((snapshot) => {
    if (snapshot.state === 'failed' || snapshot.state === 'closed') finish(new Error(snapshot.message))
    else if (snapshot.rpcReady && snapshot.runtimeReady) finish()
  })
  // onSnapshot immediately emits its current value, possibly before returning the unsubscriber.
  if (settled) unsubscribe()
})
