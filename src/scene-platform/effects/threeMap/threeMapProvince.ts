import type { ThreeMapDiagnostic, ThreeMapLocation } from './threeMapTypes'

export const CHINA_PROVINCE_CENTERS: Readonly<Record<string, [number, number]>> = Object.freeze({
  北京: [116.41995, 40.18994], 天津: [117.347043, 39.288036], 河北: [114.502461, 38.045474],
  山西: [112.304436, 37.618179], 内蒙古: [114.077429, 44.331087], 辽宁: [122.604994, 41.299712],
  吉林: [126.171208, 43.703954], 黑龙江: [127.693027, 48.040465], 上海: [121.438737, 31.072559],
  江苏: [119.486506, 32.983991], 浙江: [120.109913, 29.181466], 安徽: [117.226884, 31.849254],
  福建: [118.006468, 26.069925], 江西: [115.732975, 27.636112], 山东: [118.187759, 36.376092],
  河南: [113.619717, 33.902648], 湖北: [112.271301, 30.987527], 湖南: [111.711649, 27.629216],
  广东: [113.429919, 23.334643], 广西: [108.7944, 23.833381], 海南: [109.754859, 19.189767],
  重庆: [107.8839, 30.067297], 四川: [102.693453, 30.674545], 贵州: [106.880455, 26.826368],
  云南: [101.485106, 25.008643], 西藏: [88.388277, 31.56375], 陕西: [108.887114, 35.263661],
  甘肃: [103.823557, 36.058039], 青海: [96.043533, 35.726403], 宁夏: [106.169866, 37.291332],
  新疆: [85.294711, 41.371801], 台湾: [120.971485, 23.749452], 香港: [114.134357, 22.377366],
  澳门: [113.566988, 22.159307],
})

const PROVINCE_SUFFIX = /(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/
const aliases = new Map<string, string>()
Object.keys(CHINA_PROVINCE_CENTERS).forEach((name) => {
  aliases.set(name, name)
  aliases.set(`${name}省`, name)
  aliases.set(`${name}市`, name)
})
;[
  ['内蒙古自治区', '内蒙古'], ['广西壮族自治区', '广西'], ['宁夏回族自治区', '宁夏'],
  ['新疆维吾尔自治区', '新疆'], ['西藏自治区', '西藏'], ['香港特别行政区', '香港'],
  ['澳门特别行政区', '澳门'], ['台湾省', '台湾'],
].forEach(([alias, name]) => aliases.set(alias, name))

export const normalizeProvinceName = (input: unknown): string | null => {
  if (typeof input !== 'string') return null
  const value = input.trim().replace(/\s+/g, '')
  if (!value) return null
  return aliases.get(value) ?? aliases.get(value.replace(PROVINCE_SUFFIX, '')) ?? null
}

export function resolveThreeMapLocation(
  location: ThreeMapLocation,
  diagnostics: ThreeMapDiagnostic[] = [],
  itemId?: string,
): [number, number, number] | null {
  if (location.mode === 'coordinate') {
    if (!Number.isFinite(location.longitude) || !Number.isFinite(location.latitude)) {
      diagnostics.push({ code: 'invalid-flight', message: '经纬度端点无效', itemId })
      return null
    }
    return [location.longitude, location.latitude, Number(location.altitude) || 0]
  }
  const name = normalizeProvinceName(location.provinceName)
  if (!name) {
    diagnostics.push({ code: 'unknown-province', message: `未知省份：${location.provinceName}`, itemId })
    return null
  }
  const center = CHINA_PROVINCE_CENTERS[name]
  return center ? [center[0], center[1], 0] : null
}
