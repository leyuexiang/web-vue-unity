import type { ConditionSide } from '@/types/event'

export type ConditionSideFieldConfig = {
  objectTypeKey: 'sourceObjectType' | 'targetObjectType'
  fixedValueTypeKey: 'sourceFixedValueType' | 'targetFixedValueType'
  fixedValueKey: 'sourceFixedValue' | 'targetFixedValue'
  textKey: 'sourceUrlParamsName' | 'targetUrlParamsName'
  urlFallbackKey: 'sourceUrlParamsValue' | 'targetUrlParamsValue'
  modelValueKey: 'sourceModelValue' | 'targetModelValue'
  modelValueTypeKey: 'sourceModelValueType' | 'targetModelValueType'
  domSelectorKey: 'sourceDomSelector' | 'targetDomSelector'
  domSelectorTypeKey: 'sourceDomSelectorType' | 'targetDomSelectorType'
  datasetPropertyKey: 'sourceDatasetProperty' | 'targetDatasetProperty'
  componentDataFieldKey: 'sourceComponentDataField' | 'targetComponentDataField'
  widgetRuntimeFieldKey: 'sourceWidgetRuntimeField' | 'targetWidgetRuntimeField'
}

export const CONDITION_SIDE_FIELD_MAP: Record<
  ConditionSide,
  ConditionSideFieldConfig
> = {
  source: {
    objectTypeKey: 'sourceObjectType',
    fixedValueTypeKey: 'sourceFixedValueType',
    fixedValueKey: 'sourceFixedValue',
    textKey: 'sourceUrlParamsName',
    urlFallbackKey: 'sourceUrlParamsValue',
    modelValueKey: 'sourceModelValue',
    modelValueTypeKey: 'sourceModelValueType',
    domSelectorKey: 'sourceDomSelector',
    domSelectorTypeKey: 'sourceDomSelectorType',
    datasetPropertyKey: 'sourceDatasetProperty',
    componentDataFieldKey: 'sourceComponentDataField',
    widgetRuntimeFieldKey: 'sourceWidgetRuntimeField',
  },
  target: {
    objectTypeKey: 'targetObjectType',
    fixedValueTypeKey: 'targetFixedValueType',
    fixedValueKey: 'targetFixedValue',
    textKey: 'targetUrlParamsName',
    urlFallbackKey: 'targetUrlParamsValue',
    modelValueKey: 'targetModelValue',
    modelValueTypeKey: 'targetModelValueType',
    domSelectorKey: 'targetDomSelector',
    domSelectorTypeKey: 'targetDomSelectorType',
    datasetPropertyKey: 'targetDatasetProperty',
    componentDataFieldKey: 'targetComponentDataField',
    widgetRuntimeFieldKey: 'targetWidgetRuntimeField',
  },
}
