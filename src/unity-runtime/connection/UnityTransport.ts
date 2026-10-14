import type {
  UnityEditorEventType,
  UnityEditorMethod,
  UnityEventEnvelope,
  UnityRequestEnvelope,
  UnityResponseEnvelope,
} from '@/unity-runtime/protocol/types'

export interface UnityTransport {
  connect(): Promise<void>
  disconnect(): Promise<void>
  request<TRequest, TResponse>(
    method: UnityEditorMethod,
    envelope: UnityRequestEnvelope<TRequest>,
  ): Promise<UnityResponseEnvelope<TResponse>>
  notify<TRequest>(method: UnityEditorMethod, envelope: UnityRequestEnvelope<TRequest>): void
  subscribe<TPayload>(
    type: UnityEditorEventType,
    listener: (event: UnityEventEnvelope<TPayload>) => void,
  ): () => void
}
