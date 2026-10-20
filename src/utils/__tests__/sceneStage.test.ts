import { describe, expect, it } from 'vitest'
import {
  calculateSceneStageCoverLayout,
  calculateSceneStageLayout,
  calculateSceneViewportFillLayout,
} from '../sceneStage'

describe('sceneStage', () => {
  it('keeps the fixed publish stage letterboxed inside the viewport', () => {
    const layout = calculateSceneStageLayout(800, 600, { width: 1920, height: 1080 })

    expect(layout.width).toBe(1920)
    expect(layout.height).toBe(1080)
    expect(layout.scale).toBeCloseTo(800 / 1920)
    expect(layout.left).toBeCloseTo(0)
    expect(layout.top).toBeCloseTo(75)
  })

  it('fills the viewport for professional 3D editing layouts', () => {
    expect(calculateSceneViewportFillLayout(794.4, 1061.6)).toEqual({
      width: 794,
      height: 1062,
      scale: 1,
      left: 0,
      top: 0,
    })
  })

  it('covers the preview viewport without changing design coordinates', () => {
    const layout = calculateSceneStageCoverLayout(800, 600, { width: 1920, height: 1080 })

    expect(layout.width).toBe(1920)
    expect(layout.height).toBe(1080)
    expect(layout.scale).toBeCloseTo(600 / 1080)
    expect(layout.left).toBeCloseTo(-133.3333333333)
    expect(layout.top).toBeCloseTo(0)
  })
})
