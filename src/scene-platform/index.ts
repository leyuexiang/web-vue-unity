/** 二维迁移公共出口：仅暴露纯领域、命令及无图形运行时，避免引擎重导出触发静态解析。 */
export type {
  AssetKind,
  AssetRef,
  BillboardAppearance,
  BillboardConfig,
  BillboardContent,
  BillboardContentBlock,
  BillboardFontStyle,
  BillboardTextAlign,
  BillboardTextDecoration,
  BillboardTextRun,
  BillboardVerticalAlign,
  BoundingVolume,
  CameraPath,
  EffectSpec,
  GeoTransform,
  GeoCameraPathWaypoint,
  LocalTransform,
  ModelMaterialAlphaMode,
  ModelMaterialDerivedAsset,
  ModelMaterialProfile,
  ModelMaterialProfileState,
  ModelMaterialRule,
  ModelMaterialRuleSource,
  ModelMaterialSelector,
  ModelAssetKind,
  ModelLodVariant,
  RuntimeStreamingOptions,
  SceneStreamingRuntimeContext,
  SceneStreamingRuntimeOverrides,
  SceneChunk,
  SceneCoordinateSystem,
  SceneDefinition,
  SceneLayer,
  SceneLightConfig,
  SceneObject,
  SceneObjectType,
  FirstPersonConfig,
  SceneSettings,
  SceneStreamingConfig,
  SceneTransform,
  SceneType,
  SceneViewportGridSettings,
  StreamingGroup,
  VegetationBatchKey,
  VegetationChunkRecord,
  VegetationDeltaOperation,
  VegetationElevationSourceDefinition,
  VegetationGeoPolygon,
  VegetationGeoPosition,
  VegetationAltitudeGapPolicy,
  VegetationAltitudeBandRule,
  VegetationAltitudeZoneDefinition,
  VegetationAltitudeZonationRule,
  VegetationCorridorRule,
  VegetationPlantingRule,
  VegetationPlantingRuleBase,
  VegetationPolygonRule,
  VegetationEditingOptions,
  VegetationLayerDefinition,
  VegetationLayerDensityTilesetAssets,
  VegetationLayerKind,
  VegetationPublicationRef,
  VegetationQualityPreset,
  VegetationSpeciesDefinition,
  VegetationSpeciesMixEntry,
  VegetationSpeciesPlantingRuleBase,
  VegetationStreamingOptions,
  VegetationSystemDefinition,
  VegetationThreeStreamingOptions,
  VegetationVerticalDatum,
} from './core/types'
export {
  CAMERA_PATH_DURATION_RANGE,
  CAMERA_PATH_DEFAULT_TURN_DURATION_MS,
  CAMERA_PATH_TIME_STEP_MS,
  CAMERA_PATH_TURN_DURATION_RANGE,
  getCameraPathMinimumTotalDurationMs,
  normalizeCameraPathDurationMs,
  normalizeCameraPathTurnDurationMs,
} from './core/cameraPath'
export {
  BILLBOARD_MAX_BLOCK_COUNT,
  BILLBOARD_MAX_BLOCK_TEXT_LENGTH,
  BILLBOARD_MAX_IMAGE_SIZE,
  BILLBOARD_MAX_RUN_COUNT,
  BILLBOARD_MAX_SIZE,
  BILLBOARD_MAX_TEXT_LENGTH,
  BILLBOARD_LETTER_SPACING_RANGE,
  BILLBOARD_TEXT_WIDTH_RANGE,
  BILLBOARD_DISTANCE_RANGE,
  BILLBOARD_DISTANCE_SCALE_RANGE,
  BILLBOARD_IMAGE_EMISSIVE_RANGE,
  BILLBOARD_ADDED_IMAGE_DEFAULT_HEIGHT,
  BILLBOARD_ADDED_IMAGE_DEFAULT_WIDTH,
  BILLBOARD_DEFAULT_HEIGHT,
  BILLBOARD_DEFAULT_ICON_HEIGHT,
  BILLBOARD_DEFAULT_ICON_WIDTH,
  BILLBOARD_DEFAULT_FAR_DISTANCE,
  BILLBOARD_DEFAULT_FAR_SCALE,
  BILLBOARD_DEFAULT_IMAGE_EMISSIVE_COLOR,
  BILLBOARD_DEFAULT_MAXIMUM_DISPLAY_DISTANCE,
  BILLBOARD_DEFAULT_NEAR_DISTANCE,
  BILLBOARD_DEFAULT_NEAR_SCALE,
  BILLBOARD_DEFAULT_PARAGRAPH_FONT_SIZE,
  BILLBOARD_DEFAULT_TITLE_FONT_SIZE,
  BILLBOARD_DEFAULT_WIDTH,
  createDefaultBillboardConfig,
  normalizeBillboardColor,
  normalizeBillboardConfig,
} from './core/billboard'
export type {
  SceneDefinitionMigrationInput,
  SceneDefinitionMigrationResult,
} from './core/sceneDefinition'
export {
  CURRENT_SCENE_SCHEMA_VERSION,
  createSceneDefinition,
  migrateLegacySceneDefinition,
  parseSceneDefinition,
  pruneSceneStreamingChunkObjectReferences,
  serializeSceneDefinition,
  validateSceneDefinition,
} from './core/sceneDefinition'
export type {
  CreateVegetationSystemDefinitionInput,
  VegetationValidationResult,
  VegetationValidationOptions,
} from './core/vegetation'
export {
  CURRENT_VEGETATION_SCHEMA_VERSION,
  DEFAULT_VEGETATION_PUBLICATION_DENSITY_PROFILES,
  DEFAULT_VEGETATION_EDITING_OPTIONS,
  DEFAULT_VEGETATION_ELEVATION_SOURCE,
  DEFAULT_VEGETATION_STREAMING_OPTIONS,
  VEGETATION_SPECIES_DEFAULT_SCALE_RANGE,
  VEGETATION_SPECIES_SCALE_RANGE,
  createVegetationSystemDefinition,
  deriveVegetationRuleSeed,
  normalizeVegetationSystemDefinition,
  validateVegetationSystemDefinition,
} from './core/vegetation'
export type {
  VegetationDynamicTile,
  VegetationDynamicTileIdentity,
} from './core/vegetationDynamicTiles'
export {
  createVegetationDynamicTileWindow,
  resolveVegetationDynamicTileIdentity,
  VEGETATION_DYNAMIC_TILE_EDGE_M,
  VEGETATION_DYNAMIC_TILE_PROTOCOL_VERSION,
  VEGETATION_DYNAMIC_TILE_WINDOW_RADIUS,
  VEGETATION_DYNAMIC_TILE_WINDOW_TILE_COUNT,
} from './core/vegetationDynamicTiles'
export type {
  CesiumVegetationShadowMode,
  VegetationQualityRenderingProfile,
} from './core/vegetationRendering'
export {
  VEGETATION_QUALITY_RENDERING_PROFILES,
  resolveVegetationQualityRenderingProfile,
} from './core/vegetationRendering'
export type {
  VegetationPerformanceGovernorOptions,
  VegetationPerformanceGovernorSnapshot,
} from './core/vegetationPerformanceGovernor'
export { VegetationPerformanceGovernor } from './core/vegetationPerformanceGovernor'
export {
  EDITOR_AUTO_STREAMING_CHUNK_TAG,
  EDITOR_AUTO_STREAMING_GROUP_ID,
  isEditorAutoStreamingChunk,
  resolveSceneStreamingConfigForRuntime,
} from './core/sceneStreamingPolicy'
export {
  clearSceneQualityPreset,
  DEFAULT_SCENE_ANTIALIASING_SETTINGS,
  DEFAULT_SCENE_QUALITY_PRESET,
  DEFAULT_SCENE_RENDER_SCALE,
  getSceneQualityPreset,
  getSceneRenderScale,
  getSceneAntialiasEnabled,
  getSceneAntialiasingSettings,
  mergeSceneQualityPreset,
  mergeSceneAntialiasSettings,
  mergeSceneAntialiasingSettings,
  SCENE_QUALITY_PRESET_SETTINGS,
} from './core/sceneRenderingSettings'
export type {
  SceneAntialiasingMode,
  SceneAntialiasingSettings,
  SceneQualityPreset,
  SceneRenderScale,
} from './core/sceneRenderingSettings'
export {
  DEFAULT_MODEL_MATERIAL_ALPHA_CUTOFF,
  applyMaterialProfileToAsset,
  attachDerivedAssetToMaterialProfile,
  confirmDetectedMaterialRules,
  createMaterialProfileFromInspection,
  findModelMaterialRule,
  isModelMaterialBlendMode,
  markMaterialProfileUnavailable,
  resetMaterialProfile,
  resolveModelMaterialAssetUrl,
} from './core/modelMaterialProfile'
export type {
  GltfDocumentLite,
  GltfImageBlobReader,
  GltfMaterialInspectionItem,
  GltfMaterialInspectionResult,
  ImageAlphaDetector,
  InspectGltfAssetBytesOptions,
  InspectGltfAssetBytesResult,
  ParsedGltfPackageLite,
} from './core/gltfMaterialInspection'
export {
  buildRecommendedMaterialProfile,
  createGltfImageBlobReader,
  detectCutoutAlphaImage,
  inspectGltfAssetBytes,
  inspectGltfMaterials,
  isGltfAssetUrl,
  parseGltfPackage,
  readBufferViewFromBinaryChunk,
} from './core/gltfMaterialInspection'

export type { SceneCommand } from './commands/types'
export type { ScenePanelConfig, ScenePanelVector3 } from './core/scenePanelConfig'
export { createCreateObjectCommand } from './commands/createObjectCommand'
export {
  createCreateVolumeHeatmapEffectCommand,
  type CreateVolumeHeatmapEffectCommandOptions,
} from './commands/createVolumeHeatmapEffectCommand'
export {
  createUpdateVolumeHeatmapEffectCommand,
  type UpdateVolumeHeatmapEffectCommandOptions,
} from './commands/updateVolumeHeatmapEffectCommand'
export {
  createUpdateThreeMapEffectCommand,
  isThreeMapEffect,
  type UpdateThreeMapEffectCommandOptions,
} from './commands/updateThreeMapEffectCommand'
export { createDeleteObjectCommand } from './commands/deleteObjectCommand'
export { createUpdateObjectTransformCommand } from './commands/updateObjectTransformCommand'
export { createUpdateFirstPersonCommand } from './commands/updateFirstPersonCommand'
export { createUpdateSceneLightCommand } from './commands/updateSceneLightCommand'
/**
 * 属性面板的新增编辑命令统一从平台入口导出。
 *
 * 远端公共属性控件只依赖该入口；保留既有流式加载相关导出，避免编辑器页面绕过平台内部路径。
 */
export { createUpdateObjectVisibilityCommand } from './commands/updateObjectVisibilityCommand'
export {
  createCreateObjectLayerCommand,
  createDeleteObjectLayerCommand,
  createMoveObjectToLayerCommand,
  createReorderObjectLayersCommand,
  createUpdateObjectLayerCommand,
  createUpdateObjectLockCommand,
  createUpdateObjectNameCommand,
  type ObjectLayerPatch,
} from './commands/objectLayerCommands'
export {
  createUpdateObjectExtensionsCommand,
  type UpdateObjectExtensionsPatch,
} from './commands/updateObjectExtensionsCommand'
export {
  createUpdateObjectStyleCommand,
  type UpdateObjectStylePatch,
} from './commands/updateObjectStyleCommand'
export { createUpdateBillboardCommand } from './commands/updateBillboardCommand'
export {
  createUpdateObjectGeometryOffsetCommand,
  type SceneObjectGeometryOffset,
} from './commands/updateObjectGeometryOffsetCommand'
export { createUpdateWeatherEffectCommand } from './commands/updateWeatherEffectCommand'
export type { UpdateWeatherEffectCommandOptions } from './commands/updateWeatherEffectCommand'
export {
  createUpdateSceneSettingsCommand,
  type UpdateSceneSettingsCommandOptions,
} from './commands/updateSceneSettingsCommand'
export { createUpdateCameraPathsCommand } from './commands/updateCameraPathsCommand'
export {
  createUpdateCameraCommand,
  type ThreeCameraSnapshot,
  type UpdateCameraCommandOptions,
} from './commands/updateCameraCommand'
export {
  DEFAULT_VEGETATION_DRAFT_LAYER_ID,
  VegetationCommandValidationError,
  createDefaultVegetationAuthoringDefinition,
  createRemoveVegetationLayerCommand,
  createRemoveVegetationRuleCommand,
  createRemoveVegetationSpeciesCommand,
  createUpdateVegetationSystemCommand,
  createUpsertVegetationLayerCommand,
  createUpsertVegetationRuleCommand,
  createUpsertVegetationSpeciesCommand,
} from './commands/vegetationCommands'
export type { UpsertVegetationSpeciesCommandOptions } from './commands/vegetationCommands'

export * from './effects/weather'
export * from './effects/volumeHeatmap'
export * from './effects/threeMap'

export type { SceneStore, SceneStoreEvent } from './store/sceneStore'
export { createSceneStore } from './store/sceneStore'
export type { CommandBus } from './store/commandBus'
export { createCommandBus } from './store/commandBus'

/** 路径点编辑类型由平台入口统一转发，面板无需依赖具体运行时实现文件。 */
export type {
  CameraPathWaypointDragPreview,
  CameraPathWaypointGizmoMode,
  CameraPathWaypointOrientationAxis,
  CameraPathWaypointTranslationHandle,
  SceneObjectActivationResolver,
  SceneRuntime,
  VegetationGeometryEditingSnapshot,
  VegetationGeometryPointDragPreview,
  VegetationGeometryPointHit,
  VegetationGeometryPointTranslationHandle,
} from './runtime/sceneRuntime'
export { FirstPersonPreviewController } from './runtime/firstPersonPreview'
export type { FirstPersonPreviewPose, FirstPersonPreviewControllerOptions } from './runtime/firstPersonPreview'
export type {
  FrameTarget,
  PickHitType,
  PickResult,
  PickWorldPoint,
  PickWorldPointSource,
  RuntimeStreamingCacheState,
  RuntimeStreamingChannelState,
  RuntimeStreamingObservedChannelState,
  RuntimeStreamingState,
  RuntimeTerrainHeightSample,
  RuntimeTerrainSamplePosition,
  RuntimeTerrainSamplingCapabilities,
  RuntimeTerrainSamplingOptions,
  RuntimeTerrainSamplingUnavailableReason,
  RuntimeTerrainVerticalDatum,
  RuntimeVegetationPreviewState,
  RuntimeVegetationPreviewStatus,
  RuntimeVegetationPreviewBreakdown,
  RuntimeVegetationPreviewDiagnostics,
  RuntimeVegetationPerformanceDiagnostics,
  RuntimeVegetationTilesetDiagnostics,
  RuntimeVegetationDiagnostics,
  RuntimeVegetationObservedState,
  RuntimeVegetationState,
  SceneCameraState,
  SceneObjectStreamingInteraction,
  SceneObjectStreamingInteractionKind,
  ScreenPoint,
} from './runtime/runtimeTypes'
export {
  createPickResult,
  createRuntimeStreamingState,
  createRuntimeVegetationPreviewState,
  createRuntimeVegetationState,
} from './runtime/runtimeTypes'
export type {
  SceneObjectAdapter,
  SceneObjectAdapterContext,
  SceneObjectAdapterEntry,
} from './runtime/sceneObjectAdapter'
export { createSceneObjectAdapterEntry } from './runtime/sceneObjectAdapter'
export type {
  AssetLoader,
  AssetLoaderContext,
  AssetLoadError,
  AssetLoadErrorCode,
  AssetLoadFailure,
  AssetLoadResult,
  AssetLoadStatus,
  AssetLoadSuccess,
  DisposableAssetHandle,
} from './runtime/assetLoader'
export {
  createAssetKindMatcher,
  createAssetLoadFailure,
  createAssetLoadSuccess,
  createDisposableAssetHandle,
} from './runtime/assetLoader'
export type {
  CoordinateTransformContext,
  CoordinateTransformError,
  CoordinateTransformErrorCode,
  CoordinateTransformFailure,
  CoordinateTransformResult,
  CoordinateTransformService,
  CoordinateTransformSuccess,
  RuntimeCoordinateKind,
  RuntimeCoordinateSnapshot,
} from './runtime/coordinateTransformService'
export {
  createCoordinateTransformFailure,
  createCoordinateTransformSuccess,
  createGeoRuntimeCoordinateSnapshot,
  createLocalRuntimeCoordinateSnapshot,
  normalizeTransformScale,
  validateTransformCoordinateSystem,
} from './runtime/coordinateTransformService'
export type { RuntimeCapabilities } from './runtime/runtimeCapabilities'
export { createDefaultRuntimeCapabilities } from './runtime/runtimeCapabilities'
export { BaseSceneRuntime } from './runtime/baseSceneRuntime'
export { MemorySceneRuntime } from './runtime/memory/memorySceneRuntime'
export type { RuntimeBridge } from './runtime/runtimeBridge'
export { createRuntimeBridge } from './runtime/runtimeBridge'

/**
 * 通用操控器共享核心从平台入口统一导出。
 *
 * 编辑器、Cesium 和 Three.js 适配器只依赖该公共能力面，不穿透到核心内部文件；共享核心本身不导入
 * 任何引擎、Vue、Pinia 或业务 Store。
 */
// 三维操控器待第二阶段接入，二维公共出口不导出具体操控器。

export type { SceneRepository, SceneSummary } from './persistence/sceneRepository'
export { createInMemorySceneRepository } from './persistence/sceneRepository'

export type { ViewportHost, ViewportHostOptions } from './editor/viewportHost'
export { createViewportHost } from './editor/viewportHost'
export type {
  EditorSceneObjectGisMappingOptions,
  EditorSceneObjectMappingOptions,
  EditorSceneObjectModel,
} from './editor/editorSceneObjectMapper'
export {
  mapEditorCreationToGisSceneObject,
  mapEditorCreationToSceneObject,
} from './editor/editorSceneObjectMapper'
export type { EditorObjectIdSource } from './editor/editorObjectDeletionSync'
export { getRemovedEditorObjectIds } from './editor/editorObjectDeletionSync'
