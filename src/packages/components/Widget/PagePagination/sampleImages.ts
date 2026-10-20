import factoryImage from './assets/factory.svg'
import processImage from './assets/process.svg'
import qualityImage from './assets/quality.svg'
import equipmentImage from './assets/equipment.svg'

/** 默认图片使用透明背景的等距插画，避免再次把字体图标误当作业务素材。 */
export const PAGE_PAGINATION_SAMPLE_IMAGES = {
  overview: { iconUrl: factoryImage, activeIconUrl: '' },
  process: { iconUrl: processImage, activeIconUrl: '' },
  quality: { iconUrl: qualityImage, activeIconUrl: '' },
  equipment: { iconUrl: equipmentImage, activeIconUrl: '' },
} as const

/** 旧配置里的字体图标映射到对应示例图，保证升级后已有分页器仍可正常显示。 */
export const PAGE_PAGINATION_LEGACY_IMAGES: Record<
  string,
  { iconUrl: string; activeIconUrl: string }
> = {
  'uim:house-user': PAGE_PAGINATION_SAMPLE_IMAGES.overview,
  'uim:box': PAGE_PAGINATION_SAMPLE_IMAGES.process,
  'uim:shield-plus': PAGE_PAGINATION_SAMPLE_IMAGES.quality,
  'uim:battery-bolt': PAGE_PAGINATION_SAMPLE_IMAGES.equipment,
}
