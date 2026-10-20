export type WeatherV2Mode = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'night'

export type WeatherV2QualityProfile = 'editor-low' | 'balanced' | 'showcase'
export type WeatherV2CloudQuality = 'off' | 'low' | 'medium' | 'high'
export type WeatherV2SunTimeMode = 'fixed' | 'realtime'

export interface WeatherV2SunParams {
  enabled: boolean
  dateTimeIso: string | null
  timeMode: WeatherV2SunTimeMode
  timeOfDayMinutes: number
  azimuthDeg: number
  elevationDeg: number
  /** 太阳光颜色使用可序列化的 CSS 色值，GIS 运行时会转换为引擎颜色对象。 */
  color: string
  /** 太阳光强度；限制在合理区间，避免异常配置导致画面过曝或失去明暗层次。 */
  intensity: number
  colorTemperature: number
  dynamicLighting: boolean
  shadowEnabled: boolean
}

export interface WeatherV2ShadowParams {
  enabled: boolean
  mapSize: number
  softShadows: boolean
  darkness: number
  maximumDistance: number
}

export interface WeatherV2AtmosphereParams {
  skyVisible: boolean
  groundVisible: boolean
  hazeIntensity: number
  hueShift: number
  saturationShift: number
  brightnessShift: number
  lightIntensity: number
  perFragment: boolean
  rayleighScaleHeight: number
  mieScaleHeight: number
}

export interface WeatherV2CloudParams {
  enabled: boolean
  coverage: number
  altitude: number
  thickness: number
  opacity: number
  brightness: number
  density: number
  noiseScale: number
  detailStrength: number
  windDirectionDeg: number
  windSpeed: number
  quality: WeatherV2CloudQuality
}

export interface WeatherV2CloudShadowParams {
  enabled: boolean
  opacity: number
  scale: number
  softness: number
  speed: number
  textureScale: number
  maxDistance: number
  followWind: boolean
}

export interface WeatherV2FogParams {
  enabled: boolean
  startHeight: number
  endHeight: number
  startOpacity: number
  endOpacity: number
  color: string
  alpha: number
}

export interface WeatherV2LightShaftParams {
  enabled: boolean
  intensity: number
  decay: number
  samples: number
  noiseStrength: number
  maxDistance: number
}

export interface WeatherV2RainParams {
  enabled: boolean
  intensity: number
  speed: number
  windDirectionDeg: number
  size: number
  opacity: number
  impact: WeatherV2RainImpactParams
}

export interface WeatherV2RainImpactParams {
  enabled: boolean
  spawnRate: number
  radius: number
  lifetime: number
  maxRipples: number
}

export interface WeatherV2SnowParams {
  enabled: boolean
  intensity: number
  speed: number
  windDirectionDeg: number
  size: number
  opacity: number
}

export interface WeatherV2SurfaceParams {
  wetness: number
  puddle: number
  rippleStrength: number
  puddleSlopeLimitDeg: number
  roughness: number
  reflectionStrength: number
  accumulation: number
  evaporation: number
  snowAmount: number
  snowSoftness: number
}

export interface WeatherV2QualityParams {
  profile: WeatherV2QualityProfile
  targetFps: number
  autoDowngrade: boolean
  cloudBudget: number
  particleBudget: number
  textureScale: number
  maxTextureSize: number
}

export interface WeatherV2EffectParams {
  enabled: boolean
  mode: WeatherV2Mode
  presetId?: string
  sun: WeatherV2SunParams
  shadow: WeatherV2ShadowParams
  atmosphere: WeatherV2AtmosphereParams
  clouds: WeatherV2CloudParams
  cloudShadow: WeatherV2CloudShadowParams
  fog: WeatherV2FogParams
  lightShafts: WeatherV2LightShaftParams
  rain: WeatherV2RainParams
  snow: WeatherV2SnowParams
  surface: WeatherV2SurfaceParams
  quality: WeatherV2QualityParams
}
