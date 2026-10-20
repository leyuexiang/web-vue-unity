export interface NumberAnimationFrameDriver {
  now: () => number
  request: (callback: FrameRequestCallback) => number
  cancel: (requestId: number) => void
}

interface NumberAnimationControllerOptions {
  getCurrentValue: () => number
  setCurrentValue: (value: number) => void
  getDuration: () => number
  frameDriver?: NumberAnimationFrameDriver
}

/**
 * 浏览器帧调度器只在真正启动动画时访问全局对象。
 * 这样纯逻辑测试可以注入可控时钟，组件运行时仍复用浏览器原生逐帧刷新能力。
 */
const browserFrameDriver: NumberAnimationFrameDriver = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (requestId) => cancelAnimationFrame(requestId),
}

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

const normalizeNumber = (value: unknown) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

/**
 * 创建数字计数器的连续动画控制器。
 *
 * 每次接收到新终点时都先取消旧帧任务，并从界面已经渲染到的当前值继续插值。
 * 因此即使上一次动画尚未结束，也不会跳回初始值或上一次终点；同值更新则直接结束，
 * 避免无意义地申请后续动画帧。
 */
export const createNumberAnimationController = (options: NumberAnimationControllerOptions) => {
  const frameDriver = options.frameDriver || browserFrameDriver
  let animationFrame = 0

  const stop = () => {
    if (animationFrame) {
      frameDriver.cancel(animationFrame)
    }
    animationFrame = 0
  }

  const animateTo = (targetValue: unknown) => {
    stop()

    const fromValue = normalizeNumber(options.getCurrentValue())
    const toValue = normalizeNumber(targetValue)
    const duration = Math.max(0, normalizeNumber(options.getDuration()))

    if (Object.is(fromValue, toValue) || duration === 0) {
      options.setCurrentValue(toValue)
      return
    }

    const startTime = frameDriver.now()
    const step: FrameRequestCallback = (now) => {
      const progress = Math.min(Math.max((now - startTime) / duration, 0), 1)
      const easedProgress = easeOutCubic(progress)
      options.setCurrentValue(fromValue + (toValue - fromValue) * easedProgress)

      if (progress < 1) {
        animationFrame = frameDriver.request(step)
        return
      }

      /** 动画结束时写入精确终点，消除浮点插值可能留下的尾差。 */
      options.setCurrentValue(toValue)
      animationFrame = 0
    }

    animationFrame = frameDriver.request(step)
  }

  return {
    animateTo,
    stop,
  }
}
