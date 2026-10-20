import type {
  RuntimeStreamingOptions,
  SceneStreamingConfig,
  SceneStreamingRuntimeContext,
} from './types'

/**
 * 编辑器为资源市场模型自动生成的区块标记。
 *
 * 自动区块只拥有基于相机距离的可靠空间信息：模型的保守半径或地理小区域。
 * 它们用于按需创建和释放资源，不能再参与视锥或遮挡隐藏；否则 GIS 高空、倾斜相机及历史模型
 * 的近似边界都可能把仍在镜头内的实例误判为不可见。手工配置区块没有此标记，继续保留完整剔除能力。
 */
export const EDITOR_AUTO_STREAMING_CHUNK_TAG = 'editor-auto-generated'

/** 自动区块历史版本使用的稳定分组编号；兼容旧场景未写入 tags 的情况。 */
export const EDITOR_AUTO_STREAMING_GROUP_ID = 'editor-auto-near-camera-group'

/** 判断区块是否由编辑器自动生成，兼容新标签和旧稳定分组编号两种持久化格式。 */
export const isEditorAutoStreamingChunk = (
  chunkId: string,
  tags: readonly string[] | undefined,
  streamingGroupId: string | undefined,
): boolean =>
  tags?.includes(EDITOR_AUTO_STREAMING_CHUNK_TAG) === true
  || (
    streamingGroupId === EDITOR_AUTO_STREAMING_GROUP_ID
    && chunkId.includes(':auto-chunk:')
  )

/**
 * 解析某个运行上下文实际应执行的流式配置。
 *
 * 规则固定为“基础 options -> context 覆盖”：
 * - 未声明覆盖时，编辑器和发布预览得到同一份基础策略；
 * - 覆盖只影响场景级 options，chunks / groups 始终共享；
 * - 只有声明了覆盖但基础 options 缺失时，才显式补 enabled=false，避免缺字段的旧场景被意外启用。
 *
 * 返回对象不会深拷贝区块数组。Runtime 在注册时已有私有复制和索引步骤，这里重复深拷贝会放大
 * 大场景切换成本；调用方也不得修改返回的 chunks / groups。
 */
export const resolveSceneStreamingConfigForRuntime = (
  streaming: SceneStreamingConfig | undefined,
  context: SceneStreamingRuntimeContext,
): SceneStreamingConfig | undefined => {
  if (!streaming) return undefined

  const runtimeOverride = streaming.runtimeOverrides?.[context]
  if (!runtimeOverride) return streaming

  const options: RuntimeStreamingOptions = {
    enabled: false,
    ...(streaming.options ?? {}),
    ...runtimeOverride,
  }

  return {
    ...streaming,
    options,
  }
}
