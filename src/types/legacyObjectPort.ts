import type { ComponentDataConfig } from './data-config'
import type { DataPanelConfig } from './threeScene'

/**
 * 旧场景工具的最小结构契约，仅用于历史数据读取和兼容接口类型。
 * 不导入任何引擎类型，不创建矩阵、材质或图形实例。Unity 接入后由语义适配器替代旧工具调用。
 */
export interface LegacyVectorPort {
  x: number
  y: number
  z: number
  set: (x: number, y: number, z: number) => unknown
}
export interface Object3D {
  uuid: string
  name: string
  type: string
  visible: boolean
  position: LegacyVectorPort
  rotation: LegacyVectorPort
  scale: LegacyVectorPort
  userData: Record<string, unknown> & {
    dataConfig?: ComponentDataConfig | null
    datasetConfigList?: DataPanelConfig[]
    type?: string
    sceneObjectId?: string
  }
  traverse: (visit: (object: Object3D) => void) => void
}
export interface Scene extends Object3D {
  getObjectByProperty: (key: string, value: unknown) => Object3D | undefined
}
/** 旧类型名只作为结构兼容别名，不携带具体灯光或相机执行能力。 */
export type DirectionalLightHelper = Object3D
export type PointLightHelper = Object3D
export type SpotLightHelper = Object3D
export type PerspectiveCamera = Object3D
