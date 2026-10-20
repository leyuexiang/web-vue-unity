type RgbColor = {
  r: number
  g: number
  b: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeAlpha = (value: number) => clamp(value, 0, 1)

const parseAlpha = (value: string | null | undefined) => {
  if (!value) return 1

  const normalizedValue = value.trim()
  const rgbaMatch = normalizedValue.match(
    /^rgba?\(\s*[^,]+\s*,\s*[^,]+\s*,\s*[^,]+(?:\s*,\s*([\d.]+))?\s*\)$/i,
  )
  if (rgbaMatch?.[1] !== undefined) return normalizeAlpha(Number(rgbaMatch[1]))

  const hex = normalizedValue.replace(/^#/, '')
  if (/^[\da-f]{8}$/i.test(hex)) return parseInt(hex.slice(6), 16) / 255

  return 1
}

const parseHexColor = (value: string): RgbColor | null => {
  const hex = value.trim().replace(/^#/, '')
  if (!/^[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex)) return null

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

const toHsl = ({ r, g, b }: RgbColor) => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: Math.round(lightness * 100) }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0

  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0)
      break
    case green:
      hue = (blue - red) / delta + 2
      break
    default:
      hue = (red - green) / delta + 4
  }

  return {
    h: Math.round((hue / 6) * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  }
}

const toHsv = ({ r, g, b }: RgbColor) => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let hue = 0

  if (delta !== 0) {
    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0)
        break
      case green:
        hue = (blue - red) / delta + 2
        break
      default:
        hue = (red - green) / delta + 4
    }
    hue /= 6
  }

  return {
    h: Math.round(hue * 360),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  }
}

const formatAlpha = (alpha: number) =>
  normalizeAlpha(alpha).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

/**
 * EyeDropper API 只返回 sRGB 十六进制颜色。
 * 这里按照颜色选择器当前的输出格式转换，避免 rgb/rgba 配置被吸色动作改成另一种数据格式。
 */
export const formatEyeDropperColor = ({
  sRGBHex,
  currentValue,
  colorFormat,
  showAlpha,
}: {
  sRGBHex: string
  currentValue: string | null | undefined
  colorFormat?: string
  showAlpha?: boolean
}) => {
  const rgb = parseHexColor(sRGBHex)
  if (!rgb) return sRGBHex

  const alpha = showAlpha ? parseAlpha(currentValue) : 1

  switch (colorFormat) {
    case 'rgb':
      return showAlpha
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatAlpha(alpha)})`
        : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    case 'hsl': {
      const hsl = toHsl(rgb)
      return showAlpha
        ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${formatAlpha(alpha)})`
        : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    }
    case 'hsv': {
      const hsv = toHsv(rgb)
      return showAlpha
        ? `hsva(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${formatAlpha(alpha)})`
        : `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`
    }
    default: {
      const hex = sRGBHex.toUpperCase().replace(/^#/, '').slice(0, 6)
      if (showAlpha && alpha < 1) {
        return `#${hex}${Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
          .toUpperCase()}`
      }
      return `#${hex}`
    }
  }
}
