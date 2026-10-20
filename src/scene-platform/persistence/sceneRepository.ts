import type { SceneDefinition, SceneType } from '../core/types'
import {
  parseSceneDefinition,
  serializeSceneDefinition,
  validateSceneDefinition,
} from '../core/sceneDefinition'

/**
 * 场景摘要：列表页只展示这些信息，不需要加载完整场景。
 * 性能：大场景完整 JSON 可能很大，列表页只读摘要避免反序列化整个场景。
 */
export interface SceneSummary {
  id: string
  name: string
  type: SceneType
  updatedAt: number
}

/**
 * 场景仓库接口。
 *
 * 职责边界：
 * - 只负责场景的持久化（保存/加载/列表/删除）；
 * - 不负责版本管理、不负责发布、不负责资产下载；
 * - 实现侧（内存 / localStorage / IndexedDB / API）通过实现此接口替换。
 *
 * 性能约束：
 * - load 返回前必须经过 validateSceneDefinition，避免脏数据进入运行时；
 * - 实现侧若使用异步存储，应保证 save 顺序化，避免并发覆盖。
 */
export interface SceneRepository {
  save: (scene: SceneDefinition) => Promise<void>
  load: (id: string) => Promise<SceneDefinition | null>
  list: () => Promise<SceneSummary[]>
  delete: (id: string) => Promise<void>
}

interface StoredRecord {
  /** 序列化后的场景 JSON，避免在内存里持有大对象引用。 */
  serialized: string
  summary: SceneSummary
}

/**
 * 内存版 SceneRepository。
 *
 * 用途：
 * - 第一阶段跑通保存恢复闭环、契约测试、E2E；
 * - 后续可替换为 localStorage / IndexedDB / API 实现，上层代码不变。
 *
 * 性能：
 * - 存的是序列化后的字符串，而不是直接持有 SceneDefinition 引用，
 *   这样更接近真实持久化行为（避免内存里对象被外部修改后污染存储）；
 * - list 只读 summary，不反序列化整个场景。
 */
export function createInMemorySceneRepository(): SceneRepository {
  const store = new Map<string, StoredRecord>()

  const save = async (scene: SceneDefinition): Promise<void> => {
    // 保存前先校验，避免脏数据落库
    const validation = validateSceneDefinition(scene)
    if (validation.issues.length > 0) {
      throw new Error(`Cannot save invalid scene: ${validation.issues.join(' ')}`)
    }

    const serialized = serializeSceneDefinition(scene)
    const updatedAt = Date.now()

    store.set(scene.id, {
      serialized,
      summary: {
        id: scene.id,
        name: scene.name,
        type: scene.type,
        updatedAt,
      },
    })
  }

  const load = async (id: string): Promise<SceneDefinition | null> => {
    const record = store.get(id)
    if (!record) return null

    // 反序列化时再做一次校验，防止存储被外部篡改
    return parseSceneDefinition(record.serialized)
  }

  const list = async (): Promise<SceneSummary[]> => {
    const summaries = Array.from(store.values()).map((record) => record.summary)
    // 按 updatedAt 倒序，最近更新的在前
    summaries.sort((a, b) => b.updatedAt - a.updatedAt)
    return summaries
  }

  const remove = async (id: string): Promise<void> => {
    store.delete(id)
  }

  return {
    save,
    load,
    list,
    delete: remove,
  }
}
