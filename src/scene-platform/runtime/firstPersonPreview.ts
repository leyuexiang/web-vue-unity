import type { FirstPersonConfig, LocalTransform, GeoTransform } from '../core/types'

export interface FirstPersonPreviewPose {
  position: [number, number, number]
  heading: number
  pitch: number
}

export interface FirstPersonPreviewControllerOptions {
  config: FirstPersonConfig
  transform: LocalTransform | GeoTransform
  /** 返回 true 表示目标位置可行；false 时控制器保留当前位置并尝试轴向滑动。 */
  canMove?: (position: [number, number, number], movement?: readonly [number, number]) => boolean
  /** 碰撞查询尚未准备好时不允许把移动表现成可用。 */
  isCollisionAvailable?: () => boolean
  onBlocked?: (reason: 'collision' | 'unavailable') => void
  onUnblocked?: () => void
  onChange: (pose: FirstPersonPreviewPose) => void
}

/**
 * 第一人称输入与移动的引擎无关核心。
 * 键盘状态、鼠标拖拽和碰撞滑动都在这里处理，Three/Cesium 只负责把 pose 映射到相机。
 */
export class FirstPersonPreviewController {
  private readonly options: FirstPersonPreviewControllerOptions
  private readonly keys = new Set<string>()
  private dragging = false
  private lastPointer: [number, number] | null = null
  private startPose: FirstPersonPreviewPose
  private transform: LocalTransform | GeoTransform
  private config: FirstPersonConfig
  private pose: FirstPersonPreviewPose

  constructor(options: FirstPersonPreviewControllerOptions) {
    this.options = options
    this.transform = options.transform
    this.config = { ...options.config }
    this.startPose = this.getStartPose(this.transform)
    this.pose = { ...this.startPose, position: [...this.startPose.position] }
  }

  private getStartPose(transform: LocalTransform | GeoTransform): FirstPersonPreviewPose {
    return transform.kind === 'local'
      ? { position: [...transform.position], heading: transform.rotation[1], pitch: 0 }
      : {
          position: [transform.longitude, transform.latitude, transform.height],
          heading: transform.heading,
          pitch: this.config.lockPitch ? 0 : transform.pitch,
        }
  }

  getPose(): FirstPersonPreviewPose { return { ...this.pose, position: [...this.pose.position] } }
  reset(): void {
    this.pose = { ...this.startPose, position: [...this.startPose.position] }
    this.options.onUnblocked?.()
    this.options.onChange(this.getPose())
  }

  /** 编辑器属性或起点改变后调用，预览回到新的保存起点。 */
  update(config: FirstPersonConfig, transform: LocalTransform | GeoTransform): void {
    this.config = { ...config }
    this.transform = transform
    this.startPose = this.getStartPose(transform)
    this.reset()
  }

  keyDown(key: string): void { this.keys.add(key.toLowerCase()) }
  keyUp(key: string): void { this.keys.delete(key.toLowerCase()) }
  pointerDown(x: number, y: number): void { this.dragging = true; this.lastPointer = [x, y] }
  pointerUp(): void { this.dragging = false; this.lastPointer = null }
  pointerMove(x: number, y: number): void {
    if (!this.dragging || !this.lastPointer) return
    const dx = x - this.lastPointer[0]
    const dy = y - this.lastPointer[1]
    this.lastPointer = [x, y]
    this.pose.heading += dx * this.config.lookSensitivity
    if (!this.config.lockPitch) {
      this.pose.pitch = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, this.pose.pitch - dy * this.config.lookSensitivity),
      )
    }
    this.options.onChange(this.getPose())
  }

  step(deltaSeconds: number): void {
    const forward = (this.keys.has('w') ? 1 : 0) - (this.keys.has('s') ? 1 : 0)
    const strafe = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0)
    if (!forward && !strafe) return
    if (this.config.collisionEnabled && this.options.isCollisionAvailable && !this.options.isCollisionAvailable()) {
      this.options.onBlocked?.('unavailable')
      return
    }
    const length = Math.hypot(forward, strafe) || 1
    const distance = this.config.moveSpeed * Math.max(0, Math.min(deltaSeconds, 0.1)) / length
    if (distance === 0) return
    const previousPosition = this.pose.position
    const sin = Math.sin(this.pose.heading)
    const cos = Math.cos(this.pose.heading)
    const isGeo = this.transform.kind === 'geo'
    // GIS 预览的位置是经度、纬度和固定海拔；把米制移动量转换为当前纬度附近的角度。
    const east = (sin * forward + cos * strafe) * distance
    const north = (cos * forward - sin * strafe) * distance
    const metersPerDegreeLat = 111_320
    const metersPerDegreeLon = Math.max(1, metersPerDegreeLat * Math.cos(this.pose.position[1] * Math.PI / 180))
    const dx = isGeo ? east / metersPerDegreeLon : east
    const dz = isGeo ? north / metersPerDegreeLat : -north
    const northDelta = isGeo ? north / metersPerDegreeLat : dz
    // 按碰撞半径的一半分段检测整条路径，避免高速时只测终点而穿过薄墙。
    const steps = Math.max(1, Math.ceil(distance / Math.max(0.05, this.config.collisionRadius * 0.5)))
    let blocked = false
    for (let index = 0; index < steps; index += 1) {
      const nextX = this.pose.position[0] + dx / steps
      const nextHorizontal = (isGeo ? this.pose.position[1] : this.pose.position[2]) + northDelta / steps
      const target: [number, number, number] = isGeo
        ? [nextX, nextHorizontal, this.pose.position[2]]
        : [nextX, this.pose.position[1], nextHorizontal]
      const movement: readonly [number, number] = isGeo ? [east, north] : [dx, dz]
      if (!this.config.collisionEnabled || !this.options.canMove || this.options.canMove(target, movement)) {
        this.pose.position = target
        continue
      }
      const slideX: [number, number, number] = [nextX, this.pose.position[1], this.pose.position[2]]
      const slideOther: [number, number, number] = isGeo
        ? [this.pose.position[0], nextHorizontal, this.pose.position[2]]
        : [this.pose.position[0], this.pose.position[1], nextHorizontal]
      if (Math.abs(dx) > 1e-12 && this.options.canMove(slideX, [dx, 0])) this.pose.position = slideX
      else if (
        Math.abs(northDelta) > 1e-12 &&
        this.options.canMove(slideOther, [0, northDelta])
      ) {
        this.pose.position = slideOther
      }
      else {
        this.options.onBlocked?.('collision')
        blocked = true
        break
      }
    }
    if (!blocked) this.options.onUnblocked?.()
    // 靠墙停住时只反馈阻挡状态，不把同一个姿态每帧重复提交给按需渲染的相机。
    if (this.pose.position.some((value, index) => value !== previousPosition[index])) {
      this.options.onChange(this.getPose())
    }
  }

  dispose(): void { this.keys.clear(); this.pointerUp() }
}
