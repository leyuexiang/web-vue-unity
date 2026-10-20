<template>
  <el-date-picker
    v-model="innerValue"
    class="widget-inputs-date"
    :type="actualPickerType"
    value-format="x"
    format="YYYY-MM-DD HH:mm:ss"
    popper-class="scene-edit-popper scene-edit-date-popper"
    placeholder="请选择时间"
    :popper-style="{ fontFamily: option.panelFontFamily || undefined }"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config, {
  INPUTS_DATE_DEFAULT_TYPE,
  INPUTS_DATE_DIFFER_UNIT,
  INPUTS_DATE_TYPE,
} from './config'

defineOptions({ name: 'VInputsDate' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()
type InputsDateModelValue = string | number | string[] | [number, number] | null

/**
 * 运行态同样把旧数据里的 isPanel 强制归一化为 0。
 * 这样无论实例来自新建拖拽还是历史场景回显，最终都统一按下拉选择器渲染。
 */
props.option.isPanel = 0

/**
 * 预览态的时间选择器需要“可交互但不落盘”：
 * 1. 右侧基础面板改默认值时，这里要同步显示；
 * 2. 预览时用户临时选择的新时间，只更新当前实例的本地显示；
 * 3. 不直接回写 props，避免预览动作污染编辑配置。
 */
const innerValue = ref<InputsDateModelValue>('')

const actualPickerType = computed(() => {
  /**
   * 当前项目只接入了 Element Plus。
   * 它不支持 quarter / quarterrange，因此这里降级映射为 month / monthrange。
   */
  if (props.option.type === INPUTS_DATE_TYPE.QUARTER) return INPUTS_DATE_TYPE.MONTH
  if (props.option.type === INPUTS_DATE_TYPE.QUARTERRANGE) return INPUTS_DATE_TYPE.MONTHRANGE
  return props.option.type
})

const addDateOffset = (baseTime: number, value: number, unit: string) => {
  const date = new Date(baseTime)
  switch (unit) {
    case INPUTS_DATE_DIFFER_UNIT.DAY:
      date.setDate(date.getDate() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.WEEK:
      date.setDate(date.getDate() + value * 7)
      break
    case INPUTS_DATE_DIFFER_UNIT.MONTH:
      date.setMonth(date.getMonth() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.QUARTER:
      date.setMonth(date.getMonth() + value * 3)
      break
    case INPUTS_DATE_DIFFER_UNIT.YEAR:
      date.setFullYear(date.getFullYear() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.HOUR:
      date.setHours(date.getHours() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.MINUTE:
      date.setMinutes(date.getMinutes() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.SECOND:
      date.setSeconds(date.getSeconds() + value)
      break
    case INPUTS_DATE_DIFFER_UNIT.MILLISECOND:
      date.setMilliseconds(date.getMilliseconds() + value)
      break
    default:
      break
  }
  return date.getTime()
}

const buildDynamicValue = (): number | [number, number] => {
  const now = Date.now()
  const isRange = String(props.option.type).endsWith('range')
  if (isRange) {
    return [
      addDateOffset(now, Number(props.option.differValue[0]) || 0, props.option.differUnit[0]),
      addDateOffset(now, Number(props.option.differValue[1]) || 0, props.option.differUnit[1]),
    ] as [number, number]
  }
  return addDateOffset(now, Number(props.option.differValue[0]) || 0, props.option.differUnit[0])
}

watch(
  () => ({
    value: props.option.value,
    type: props.option.type,
    defaultType: props.option.defaultType,
    differValue: props.option.differValue,
    differUnit: props.option.differUnit,
  }),
  (newValue) => {
    /**
     * 和旧项目保持一致：
     * - static 直接吃当前配置值；
     * - dynamic 每次依赖项变化都按“当前时间 + 偏移”重新算；
     * - none 则清空。
     */
    if (newValue.defaultType === INPUTS_DATE_DEFAULT_TYPE.NONE) {
      innerValue.value = null
      return
    }
    if (newValue.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC) {
      innerValue.value = buildDynamicValue()
      return
    }
    innerValue.value = newValue.value
      ? Array.isArray(newValue.value)
        ? ([newValue.value[0], newValue.value[1]] as [number, number])
        : newValue.value
      : null
  },
  {
    immediate: true,
    deep: true,
  },
)

watch(
  innerValue,
  (newValue) => {
    /**
     * 时间选择器对规则系统暴露当前选中的值。
     * 单值、范围值都原样上报，后续若需要拆分开始/结束时间，再在统一入口扩展字段即可。
     * 写入入口通过上下文注入，后续替换二维运行时不需要改组件包。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
    deep: true,
  },
)
</script>

<style scoped>
.widget-inputs-date {
  width: 100%;
  height: 100%;
}

/* 字体只影响对应文字区域；缺省时继承旧样式，不参与计时或数据刷新。 */
.widget-inputs-date :deep(input) {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  font-family: var(--widget-font-family, inherit);
}
</style>
