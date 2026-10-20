/**
 * 编辑器场景面板配置。
 *
 * 该协议属于平台场景设置，而不是旧历史模块。它只包含可序列化的灯光、背景和相机参数，
 * 供场景设置命令、Three 运行时桥接和属性面板共同使用。
 */
export interface ScenePanelVector3 {
  x: number
  y: number
  z: number
}

export interface ScenePanelConfig {
  lightDirection: ScenePanelVector3
  lightIntensity: number
  backgroundColor: string
  cameraPosition: ScenePanelVector3
  controlsTarget: ScenePanelVector3
  near: number
  far: number
  fov: number
}
