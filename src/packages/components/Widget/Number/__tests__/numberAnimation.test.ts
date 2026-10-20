import { describe, expect, it } from 'vitest'
import {
  createNumberAnimationController,
  type NumberAnimationFrameDriver,
} from '../numberAnimation'

/**
 * 创建可手动推进的帧调度器，定向验证动画被新终点打断时的起点。
 * 测试不依赖真实时间，避免机器负载导致数值断言偶发抖动。
 */
const createFrameDriver = () => {
  let now = 0
  let requestId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const cancelledRequestIds: number[] = []

  const frameDriver: NumberAnimationFrameDriver = {
    now: () => now,
    request: (callback) => {
      requestId += 1
      callbacks.set(requestId, callback)
      return requestId
    },
    cancel: (id) => {
      cancelledRequestIds.push(id)
      callbacks.delete(id)
    },
  }

  const runNextFrame = (nextNow: number) => {
    now = nextNow
    const nextEntry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined
    if (!nextEntry) return

    const [id, callback] = nextEntry
    callbacks.delete(id)
    callback(now)
  }

  return {
    frameDriver,
    cancelledRequestIds,
    pendingFrameCount: () => callbacks.size,
    runNextFrame,
  }
}

describe('数字计数器连续动画', () => {
  it('新终点在动画途中到达时从当前显示值继续', () => {
    const frame = createFrameDriver()
    let displayValue = 0
    const controller = createNumberAnimationController({
      getCurrentValue: () => displayValue,
      setCurrentValue: (value) => {
        displayValue = value
      },
      getDuration: () => 1000,
      frameDriver: frame.frameDriver,
    })

    controller.animateTo(100)
    frame.runNextFrame(500)
    const interruptedValue = displayValue
    expect(interruptedValue).toBeCloseTo(87.5)

    controller.animateTo(200)
    expect(frame.cancelledRequestIds).toEqual([2])

    /** 新动画第一帧位于同一时刻，显示值不得回跳到 0 或旧终点 100。 */
    frame.runNextFrame(500)
    expect(displayValue).toBeCloseTo(interruptedValue)

    frame.runNextFrame(1000)
    expect(displayValue).toBeGreaterThan(interruptedValue)
    expect(displayValue).toBeLessThan(200)

    frame.runNextFrame(1500)
    expect(displayValue).toBe(200)
    expect(frame.pendingFrameCount()).toBe(0)
  })

  it('终点等于当前显示值时不申请动画帧', () => {
    const frame = createFrameDriver()
    let displayValue = 36
    const controller = createNumberAnimationController({
      getCurrentValue: () => displayValue,
      setCurrentValue: (value) => {
        displayValue = value
      },
      getDuration: () => 1000,
      frameDriver: frame.frameDriver,
    })

    controller.animateTo(36)

    expect(displayValue).toBe(36)
    expect(frame.pendingFrameCount()).toBe(0)
  })
})
