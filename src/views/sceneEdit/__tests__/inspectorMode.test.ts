import { describe, expect, it } from 'vitest'
import { SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'
import { getSceneInspectorPanelItems } from '../inspectorMode'

describe('场景检查器页签', () => {
  it('三维对象只提供基础、数据、状态和事件页签', () => {
    expect(getSceneInspectorPanelItems('sceneObject').map((item) => item.value)).toEqual([
      SCENE_PANEL_ENUM.Base,
      SCENE_PANEL_ENUM.Data,
      SCENE_PANEL_ENUM.Status,
      SCENE_PANEL_ENUM.Interaction,
    ])
  })

  it('二维部件仍保留动画页签', () => {
    expect(getSceneInspectorPanelItems('widget').map((item) => item.value)).toContain(
      SCENE_PANEL_ENUM.Animation,
    )
  })
})
