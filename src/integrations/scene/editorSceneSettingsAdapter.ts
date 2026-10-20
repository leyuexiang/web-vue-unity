import type { SceneCameraState, SceneDefinition, SceneRuntime, SceneSettings } from '@/scene-platform'
import type { ScenePanelConfig } from '@/scene-platform'

export interface LegacyScenePanelStateProvider {
  getScenePanelState?: () => ScenePanelConfig | null | undefined
}

type PlainRecord = Record<string, unknown>

const isPlainRecord = (value: unknown): value is PlainRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const toFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const cloneVector3 = (value: { x: unknown; y: unknown; z: unknown } | undefined) => ({
  x: toFiniteNumber(value?.x),
  y: toFiniteNumber(value?.y),
  z: toFiniteNumber(value?.z),
})

const cloneScenePanelConfig = (config: ScenePanelConfig): ScenePanelConfig => ({
  lightDirection: cloneVector3(config.lightDirection),
  lightIntensity: toFiniteNumber(config.lightIntensity),
  backgroundColor: typeof config.backgroundColor === 'string' ? config.backgroundColor : '',
  cameraPosition: cloneVector3(config.cameraPosition),
  controlsTarget: cloneVector3(config.controlsTarget),
  near: toFiniteNumber(config.near),
  far: toFiniteNumber(config.far),
  fov: toFiniteNumber(config.fov),
})

const isFiniteTuple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item))

/**
 * 复制相机纯数据快照。
 *
 * 相机快照会进入 SceneDefinition.settings 并参与四包序列化，不能直接保留 Runtime 返回的
 * 可变数组或姿态对象引用。这里同时限定有限数字，避免 Cesium 相机异常值污染保存数据。
 */
const cloneSceneCameraState = (camera: SceneCameraState): SceneCameraState | null => {
  if (camera.kind === 'unknown') return { kind: 'unknown' }

  if (camera.kind === 'three') {
    if (
      !isFiniteTuple(camera.position) ||
      !isFiniteTuple(camera.target) ||
      !Number.isFinite(camera.fov) ||
      !Number.isFinite(camera.near) ||
      !Number.isFinite(camera.far)
    ) {
      return null
    }

    return {
      kind: 'three',
      position: [...camera.position] as [number, number, number],
      target: [...camera.target] as [number, number, number],
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
    }
  }

  if (!isFiniteTuple(camera.destination)) return null

  const orientation = camera.orientation
  const normalizedOrientation =
    orientation &&
    (orientation.heading !== undefined ||
      orientation.pitch !== undefined ||
      orientation.roll !== undefined)
      ? {
          ...(orientation.heading !== undefined && Number.isFinite(orientation.heading)
            ? { heading: orientation.heading }
            : {}),
          ...(orientation.pitch !== undefined && Number.isFinite(orientation.pitch)
            ? { pitch: orientation.pitch }
            : {}),
          ...(orientation.roll !== undefined && Number.isFinite(orientation.roll)
            ? { roll: orientation.roll }
            : {}),
        }
      : undefined

  return {
    kind: 'cesium',
    destination: [...camera.destination] as [number, number, number],
    ...(normalizedOrientation && Object.keys(normalizedOrientation).length > 0
      ? { orientation: normalizedOrientation }
      : {}),
  }
}

/** 从 settings.camera 读取已保存的通用相机快照；旧数据或空对象返回 null。 */
const readPersistedSceneCameraState = (settings: SceneSettings): SceneCameraState | null => {
  if (!isPlainRecord(settings.camera)) return null

  const camera = settings.camera as unknown as SceneCameraState
  return cloneSceneCameraState(camera)
}

/**
 * 从当前 Runtime 采集相机快照。
 *
 * 只返回可序列化的值，不保存 Cesium Camera、Viewer 或 Three Object3D；Runtime 未挂载或快照
 * 不完整时返回 null，让保存流程继续使用已有的持久化相机，避免用默认位置覆盖用户数据。
 */
export const captureRuntimeSceneCameraState = (
  runtime?: Pick<SceneRuntime, 'getCamera'> | null,
): SceneCameraState | null => {
  if (!runtime) return null
  return cloneSceneCameraState(runtime.getCamera())
}

export const captureLegacyScenePanelSettings = (
  sceneApi?: LegacyScenePanelStateProvider | null,
): ScenePanelConfig | null => {
  const scenePanelState = sceneApi?.getScenePanelState?.()
  return scenePanelState ? cloneScenePanelConfig(scenePanelState) : null
}

export const mergeScenePanelSettings = (
  settings: SceneSettings,
  scenePanel: ScenePanelConfig,
): SceneSettings => {
  const previousThreeSettings = isPlainRecord(settings.three) ? settings.three : {}
  const previousDirectionalLight = isPlainRecord(previousThreeSettings.directionalLight)
    ? previousThreeSettings.directionalLight
    : {}
  const previousEditorSettings = isPlainRecord(settings.editor) ? settings.editor : {}
  const nextScenePanel = cloneScenePanelConfig(scenePanel)

  return {
    ...settings,
    three: {
      ...previousThreeSettings,
      ...(nextScenePanel.backgroundColor
        ? { background: nextScenePanel.backgroundColor }
        : {}),
      directionalLight: {
        ...previousDirectionalLight,
        intensity: nextScenePanel.lightIntensity,
        position: [
          nextScenePanel.lightDirection.x,
          nextScenePanel.lightDirection.y,
          nextScenePanel.lightDirection.z,
        ],
      },
    },
    editor: {
      ...previousEditorSettings,
      scenePanel: nextScenePanel,
    },
  }
}

/** 将当前 Runtime 相机写入场景级 settings.camera，保持相机与场景设置同一保存快照。 */
export const mergeSceneCameraSettings = (
  settings: SceneSettings,
  camera: SceneCameraState,
): SceneSettings => {
  const snapshot = cloneSceneCameraState(camera)
  if (!snapshot || snapshot.kind === 'unknown') return settings

  return {
    ...settings,
    camera: snapshot,
  }
}

export const mergeEditorSceneSettingsSnapshot = (
  scene: SceneDefinition,
  sceneApi?: LegacyScenePanelStateProvider | null,
  runtime?: Pick<SceneRuntime, 'getCamera'> | null,
): SceneDefinition => {
  const scenePanel = captureLegacyScenePanelSettings(sceneApi)
  const runtimeCamera = captureRuntimeSceneCameraState(runtime)
  let nextScene = scene

  if (scenePanel) {
    nextScene = {
      ...nextScene,
      settings: mergeScenePanelSettings(nextScene.settings, scenePanel),
    }
  }

  /**
   * GIS 主视口的相机只由 Cesium Runtime 管理，必须使用保存瞬间的经纬高和姿态覆盖旧快照。
   * 非 GIS 继续沿用 editor.scenePanel，避免改变现有 Three 场景的保存协议。
   */
  if (scene.type === 'gis' && runtimeCamera?.kind === 'cesium') {
    nextScene = {
      ...nextScene,
      settings: mergeSceneCameraSettings(nextScene.settings, runtimeCamera),
    }
  }

  return nextScene
}

export const getEditorScenePanelSettings = (
  scene: Pick<SceneDefinition, 'settings'>,
): ScenePanelConfig | null => {
  const editorSettings = isPlainRecord(scene.settings.editor) ? scene.settings.editor : null
  const scenePanelSettings = editorSettings?.scenePanel
  if (!isPlainRecord(scenePanelSettings)) return null

  return cloneScenePanelConfig(scenePanelSettings as unknown as ScenePanelConfig)
}

export const getEditorSceneCameraState = (
  scene: Pick<SceneDefinition, 'settings'>,
): SceneCameraState | null => {
  const persistedCamera = readPersistedSceneCameraState(scene.settings)
  if (persistedCamera && persistedCamera.kind !== 'unknown') return persistedCamera

  return getEditorScenePanelCameraState(scene)
}

export const applyEditorSceneCameraToRuntime = async (
  scene: Pick<SceneDefinition, 'settings'>,
  runtime?: (Pick<SceneRuntime, 'setCamera'> &
    Partial<Pick<SceneRuntime, 'type'>>) | null,
) => {
  const persistedCamera = readPersistedSceneCameraState(scene.settings)
  const camera =
    runtime?.type === 'gis'
      ? persistedCamera?.kind === 'cesium'
        ? persistedCamera
        : null
      : runtime?.type === 'local3d' && persistedCamera?.kind === 'cesium'
        ? getEditorScenePanelCameraState(scene)
        : getEditorSceneCameraState(scene)
  if (!camera || !runtime) return false

  await runtime.setCamera(camera)
  return true
}

/** 从旧 editor.scenePanel 读取 Three 相机，供 Runtime 类型明确时避免跨引擎误用快照。 */
function getEditorScenePanelCameraState(
  scene: Pick<SceneDefinition, 'settings'>,
): SceneCameraState | null {
  const scenePanel = getEditorScenePanelSettings(scene)
  if (!scenePanel) return null

  return {
    kind: 'three',
    position: [
      scenePanel.cameraPosition.x,
      scenePanel.cameraPosition.y,
      scenePanel.cameraPosition.z,
    ],
    target: [scenePanel.controlsTarget.x, scenePanel.controlsTarget.y, scenePanel.controlsTarget.z],
    fov: scenePanel.fov,
    near: scenePanel.near,
    far: scenePanel.far,
  }
}
