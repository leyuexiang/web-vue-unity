/** 三维工具的最小语义契约，不引用具体引擎或渲染对象。 */
export type CesiumGizmoMode = 'translate' | 'rotate' | 'scale'
export interface CesiumGizmoInteractionRuntime {
  type: 'gis'
  setGizmoMode: (mode: CesiumGizmoMode) => void
  getGizmoMode: () => CesiumGizmoMode
}
