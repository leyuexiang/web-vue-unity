import type { VolumeHeatmapEffectSpec } from '../effects/volumeHeatmap'
import type { EffectSpec } from '../core/types'
import type { SceneCommand } from './types'

/** 创建三维体积热力场效果命令的参数。 */
export interface CreateVolumeHeatmapEffectCommandOptions {
  effect: VolumeHeatmapEffectSpec
}

/**
 * 创建三维体积热力场。
 *
 * 命令只修改 SceneStore.effects，RuntimeBridge 会根据 effectUpserted 事件创建或更新渲染代理。
 * 这样撤销/重做、保存和本地 Three Runtime 均复用同一份领域快照，不会把纹理或体素数组写进场景。
 */
export const createCreateVolumeHeatmapEffectCommand = ({
  effect,
}: CreateVolumeHeatmapEffectCommandOptions): SceneCommand => {
  let previousEffect: EffectSpec | null = null
  let previousIndex = -1

  return {
    name: 'CreateVolumeHeatmapEffect',
    execute: (store) => {
      if (!previousEffect) {
        const current = store.getEffect(effect.id)
        previousEffect = current
        previousIndex = current ? store.getEffects().findIndex((item) => item.id === effect.id) : -1
      }
      store.upsertEffect(effect)
    },
    undo: (store) => {
      if (previousEffect) {
        store.insertEffectAt(previousEffect, previousIndex >= 0 ? previousIndex : store.getEffects().length)
      } else {
        store.removeEffect(effect.id)
      }
    },
  }
}
