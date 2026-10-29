import type { UnityResponseEnvelope } from '../protocol/types'

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const parse = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) as unknown } catch { return value }
}

/** BusinessChannel may return an envelope directly or inside JSON-RPC's Result wrapper. */
export const decodeUnityRpcResponse = (value: Record<string, unknown>, id: string): UnityResponseEnvelope<unknown> => {
  if (value.error) {
    const error = record(value.error)
    return { protocolVersion: 1, requestId: id, success: false,
      error: { code: String(error.code ?? 'RPC_ERROR'), message: String(error.message ?? 'Unity RPC 失败') } }
  }
  const outer = record(parse(value.result))
  const unwrapped = record(parse(record(outer.result).Result ?? outer.Result ?? value.result))
  const envelope = 'protocolVersion' in unwrapped && 'requestId' in unwrapped ? unwrapped : outer
  return {
    protocolVersion: Number(envelope.protocolVersion ?? 1),
    requestId: String(envelope.requestId ?? id),
    success: envelope.success !== false,
    payload: envelope.payload ?? (envelope === outer ? parse(value.result) : undefined),
    error: envelope.error as UnityResponseEnvelope['error'],
  }
}
