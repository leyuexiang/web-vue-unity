import type {
  ComponentDataConfig,
  ComponentDataRequestItem,
  ThreeMapBindingRule,
} from '@/types/data-config'
import { getDataConfigRequests } from '@/types/data-config'
import { normalizeProvinceName } from './threeMapProvince'
import type {
  ThreeMapDiagnostic,
  ThreeMapDynamicSnapshot,
  ThreeMapEffectSpec,
  ThreeMapFlightRoute,
  ThreeMapPointItem,
  ThreeMapProvinceOverride,
} from './threeMapTypes'

const valueAt = (row: Record<string, unknown>, field: string) => row[field]
const bindingsFor = (request: ComponentDataRequestItem) =>
  request.bindings.filter((binding): binding is ThreeMapBindingRule => binding.kind === 'three-map')

const mappedValue = (
  row: Record<string, unknown>,
  bindings: ThreeMapBindingRule[],
  target: ThreeMapBindingRule['targetField'],
) => {
  const binding = bindings.find((item) => item.targetField === target)
  return binding ? valueAt(row, binding.sourceField) : undefined
}

/**
 * 将数据面板的运行时快照投影到呈现器消费的效果参数中。
 * 请求响应仍只保存在 dataConfig.dataset.source；这里返回内存快照，不回写 SceneStore。
 */
export function resolveThreeMapEffectiveEffect(
  effect: ThreeMapEffectSpec,
  dataConfig?: ComponentDataConfig | null,
): { effect: ThreeMapEffectSpec; diagnostics: ThreeMapDiagnostic[] } {
  const config = dataConfig ?? effect.params.dataConfig
  const requests = getDataConfigRequests(config ?? null).filter(
    (request) =>
      effect.params.dataPolicy.emptyResponse === 'replace' || request.dataset.source.length > 0,
  )
  if (!requests.some((request) => bindingsFor(request).length > 0)) {
    return { effect, diagnostics: [] }
  }

  const snapshot = applyThreeMapDataRequests(requests, {
    provinces: effect.params.labels.overrides,
    flights: effect.params.flights.routes,
    points: effect.params.points.items,
  })
  const barsByProvince = new Map(
    effect.params.bars.items.map((item) => [
      normalizeProvinceName(item.provinceName) ?? item.provinceName,
      item,
    ]),
  )
  snapshot.provinces.forEach((province) => {
    if (province.value === undefined) return
    const previous = barsByProvince.get(province.provinceName)
    barsByProvince.set(province.provinceName, {
      id: previous?.id ?? `dynamic-bar:${province.provinceName}`,
      provinceName: province.provinceName,
      value: province.value,
      ...(province.color
        ? { color: province.color }
        : previous?.color
          ? { color: previous.color }
          : {}),
      visible: province.visible ?? previous?.visible ?? true,
    })
  })

  return {
    effect: {
      ...effect,
      params: {
        ...effect.params,
        labels: { ...effect.params.labels, overrides: snapshot.provinces },
        bars: { ...effect.params.bars, items: [...barsByProvince.values()] },
        flights: { ...effect.params.flights, routes: snapshot.flights },
        rings: snapshot.flightOrigin
          ? { ...effect.params.rings, focusLocation: snapshot.flightOrigin }
          : effect.params.rings,
        points: { ...effect.params.points, items: snapshot.points },
      },
    },
    diagnostics: snapshot.diagnostics,
  }
}

const stringValue = (value: unknown) => (value == null ? undefined : String(value))
const numberValue = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
const booleanValue = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return undefined
}

function mapProvinceRows(
  request: ComponentDataRequestItem,
  diagnostics: ThreeMapDiagnostic[],
): ThreeMapProvinceOverride[] {
  const bindings = bindingsFor(request)
  return request.dataset.source.flatMap((row, index) => {
    const rawName = mappedValue(row, bindings, 'provinceName')
    const provinceName = normalizeProvinceName(rawName)
    if (!provinceName) {
      diagnostics.push({
        code: 'unknown-province',
        message: `未知省份：${String(rawName ?? '')}`,
        itemId: `${request.id}:${index}`,
      })
      return []
    }
    const override: ThreeMapProvinceOverride = {
      id: `${request.id}:${index}`,
      provinceName,
    }
    const label = stringValue(mappedValue(row, bindings, 'label'))
    const labelEn = stringValue(mappedValue(row, bindings, 'labelEn'))
    const value = numberValue(mappedValue(row, bindings, 'value'))
    const color = stringValue(mappedValue(row, bindings, 'color'))
    const visible = booleanValue(mappedValue(row, bindings, 'visible'))
    const popup = booleanValue(mappedValue(row, bindings, 'popup'))
    const infoTitle = stringValue(mappedValue(row, bindings, 'infoTitle'))
    const infoContent = stringValue(mappedValue(row, bindings, 'infoContent'))
    const infoLevel = stringValue(mappedValue(row, bindings, 'infoLevel'))
    if (label !== undefined) override.label = label
    if (labelEn !== undefined) override.labelEn = labelEn
    if (value !== undefined) override.value = value
    if (color !== undefined) override.color = color
    if (visible !== undefined) override.visible = visible
    if (popup !== undefined) override.popup = popup
    if (infoTitle !== undefined) override.infoTitle = infoTitle
    if (infoContent !== undefined) override.infoContent = infoContent
    if (infoLevel !== undefined) override.infoLevel = infoLevel
    return [override]
  })
}

function mapFlightRows(
  request: ComponentDataRequestItem,
  diagnostics: ThreeMapDiagnostic[],
): ThreeMapFlightRoute[] {
  const bindings = bindingsFor(request)
  return request.dataset.source.flatMap((row, index) => {
    const sourceProvince = normalizeProvinceName(mappedValue(row, bindings, 'sourceProvince'))
    const targetProvince = normalizeProvinceName(mappedValue(row, bindings, 'targetProvince'))
    const sourceLongitude = numberValue(mappedValue(row, bindings, 'sourceLongitude'))
    const sourceLatitude = numberValue(mappedValue(row, bindings, 'sourceLatitude'))
    const targetLongitude = numberValue(mappedValue(row, bindings, 'targetLongitude'))
    const targetLatitude = numberValue(mappedValue(row, bindings, 'targetLatitude'))
    const source = sourceProvince
      ? { mode: 'province' as const, provinceName: sourceProvince }
      : sourceLongitude !== undefined && sourceLatitude !== undefined
        ? { mode: 'coordinate' as const, longitude: sourceLongitude, latitude: sourceLatitude }
        : null
    const target = targetProvince
      ? { mode: 'province' as const, provinceName: targetProvince }
      : targetLongitude !== undefined && targetLatitude !== undefined
        ? { mode: 'coordinate' as const, longitude: targetLongitude, latitude: targetLatitude }
        : null
    if (!source || !target) {
      diagnostics.push({
        code: 'invalid-flight',
        message: '飞线缺少完整起点或终点',
        itemId: `${request.id}:${index}`,
      })
      return []
    }
    return [
      {
        id: stringValue(mappedValue(row, bindings, 'id')) || `${request.id}:${index}`,
        name: stringValue(mappedValue(row, bindings, 'name')) || `飞线${index + 1}`,
        source,
        target,
        value: numberValue(mappedValue(row, bindings, 'value')),
        color: stringValue(mappedValue(row, bindings, 'color')) || '#6efaff',
        arcHeight: numberValue(mappedValue(row, bindings, 'arcHeight')) ?? 8,
        width: numberValue(mappedValue(row, bindings, 'width')) ?? 1.2,
        speed: numberValue(mappedValue(row, bindings, 'speed')) ?? 0.5,
        opacity: 0.9,
        visible: booleanValue(mappedValue(row, bindings, 'visible')) ?? true,
      },
    ]
  })
}

function mapPointRows(
  request: ComponentDataRequestItem,
  diagnostics: ThreeMapDiagnostic[],
): ThreeMapPointItem[] {
  const bindings = bindingsFor(request)
  return request.dataset.source.flatMap((row, index) => {
    const province = normalizeProvinceName(mappedValue(row, bindings, 'provinceName'))
    const longitude = numberValue(mappedValue(row, bindings, 'longitude'))
    const latitude = numberValue(mappedValue(row, bindings, 'latitude'))
    const location = province
      ? { mode: 'province' as const, provinceName: province }
      : longitude !== undefined && latitude !== undefined
        ? { mode: 'coordinate' as const, longitude, latitude }
        : null
    if (!location) {
      diagnostics.push({
        code: 'invalid-data-row',
        message: '点位缺少省份或完整经纬度',
        itemId: `${request.id}:${index}`,
      })
      return []
    }
    return [
      {
        id: stringValue(mappedValue(row, bindings, 'id')) || `${request.id}:${index}`,
        name: stringValue(mappedValue(row, bindings, 'name')) || `点位${index + 1}`,
        location,
        value: numberValue(mappedValue(row, bindings, 'value')),
        level: stringValue(mappedValue(row, bindings, 'level')),
        color: stringValue(mappedValue(row, bindings, 'color')) || '#55efff',
        size: numberValue(mappedValue(row, bindings, 'size')) ?? 0.65,
        icon: stringValue(mappedValue(row, bindings, 'icon')),
        visible: booleanValue(mappedValue(row, bindings, 'visible')) ?? true,
        popup: true,
      },
    ]
  })
}

const mergeBy = <T>(base: T[], incoming: T[], keyOf: (item: T) => string): T[] => {
  const result = new Map(base.map((item) => [keyOf(item), item]))
  incoming.forEach((item) => {
    const key = keyOf(item)
    const definedFields = Object.fromEntries(
      Object.entries(item as Record<string, unknown>).filter(([, value]) => value !== undefined),
    ) as Partial<T>
    result.set(
      key,
      result.has(key) ? ({ ...result.get(key), ...definedFields } as T) : item,
    )
  })
  return [...result.values()]
}

/** 按面板顺序应用最多五项请求；replace 只替换当前角色。 */
export function applyThreeMapDataRequests(
  requests: ComponentDataRequestItem[],
  staticSnapshot: Omit<ThreeMapDynamicSnapshot, 'diagnostics'>,
): ThreeMapDynamicSnapshot {
  const diagnostics: ThreeMapDiagnostic[] = []
  let provinces = structuredClone(staticSnapshot.provinces)
  let flights = structuredClone(staticSnapshot.flights)
  let flightOrigin: ThreeMapDynamicSnapshot['flightOrigin']
  let points = structuredClone(staticSnapshot.points)
  requests.slice(0, 5).forEach((request) => {
    const rules = bindingsFor(request)
    const role = rules[0]?.datasetRole
    const mergeMode = request.mergeMode ?? 'merge'
    if (role === 'province') {
      const next = mapProvinceRows(request, diagnostics)
      provinces =
        mergeMode === 'replace' ? next : mergeBy(provinces, next, (item) => item.provinceName)
    } else if (role === 'flight') {
      const next = mapFlightRows(request, diagnostics)
      flights = mergeMode === 'replace' ? next : mergeBy(flights, next, (item) => item.id)
      const nextOrigin = next.find((route) => route.visible)?.source
      flightOrigin = mergeMode === 'replace' ? nextOrigin : (flightOrigin ?? nextOrigin)
    } else if (role === 'point') {
      const next = mapPointRows(request, diagnostics)
      points = mergeMode === 'replace' ? next : mergeBy(points, next, (item) => item.id)
    }
  })
  return { provinces, flights, flightOrigin, points, diagnostics }
}

/** 丢弃迟到响应的轻量代次门。 */
export class ThreeMapDataGenerationGate {
  private generation = 0
  begin(): number {
    this.generation += 1
    return this.generation
  }
  isCurrent(generation: number): boolean {
    return generation === this.generation
  }
  invalidate(): void {
    this.generation += 1
  }
}
