<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="输入文字字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="弹出面板字体" :alone="true">
      <ScenePropertySelect v-model="option.panelFontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="类型" :alone="true">
      <ScenePropertySelect v-model="option.type" size="small" @change="resetValueByType">
        <el-option label="日期" :value="INPUTS_DATE_TYPE.DATE" />
        <el-option label="日期时间" :value="INPUTS_DATE_TYPE.DATETIME" />
        <el-option label="日期范围" :value="INPUTS_DATE_TYPE.DATERANGE" />
        <el-option label="日期时间范围" :value="INPUTS_DATE_TYPE.DATETIMERANGE" />
        <el-option label="月份" :value="INPUTS_DATE_TYPE.MONTH" />
        <el-option label="月份范围" :value="INPUTS_DATE_TYPE.MONTHRANGE" />
        <el-option label="年份" :value="INPUTS_DATE_TYPE.YEAR" />
        <el-option label="年份范围" :value="INPUTS_DATE_TYPE.YEARRANGE" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="默认值类型" :alone="true">
      <ScenePropertySelect
        v-model="option.defaultType"
        size="small"
        @change="handleDefaultTypeChange"
      >
        <el-option label="静态" :value="INPUTS_DATE_DEFAULT_TYPE.STATIC" />
        <el-option label="动态" :value="INPUTS_DATE_DEFAULT_TYPE.DYNAMIC" />
        <el-option label="无" :value="INPUTS_DATE_DEFAULT_TYPE.NONE" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box
      v-if="option.defaultType === INPUTS_DATE_DEFAULT_TYPE.STATIC"
      name="静态默认值"
      :alone="true"
    >
      <ScenePropertyDatePicker
        v-model="option.value"
        :type="actualPickerType"
        value-format="x"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="请选择时间"
      />
    </setting-item-box>

    <setting-item-box
      v-if="option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC"
      :name="isRange ? '开始值动态偏移' : '动态偏移'"
      :alone="true"
    >
      <ScenePropertyNumberInput v-model="option.differValue[0]" size="small" />
    </setting-item-box>

    <setting-item-box
      v-if="option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC"
      :name="isRange ? '开始值偏移单位' : '偏移单位'"
      :alone="true"
    >
      <ScenePropertySelect v-model="option.differUnit[0]" size="small">
        <el-option
          v-for="item in differUnitOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box
      v-if="option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC && isRange"
      name="结束值动态偏移"
      :alone="true"
    >
      <ScenePropertyNumberInput v-model="option.differValue[1]" size="small" />
    </setting-item-box>

    <setting-item-box
      v-if="option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC && isRange"
      name="结束值偏移单位"
      :alone="true"
    >
      <ScenePropertySelect v-model="option.differUnit[1]" size="small">
        <el-option
          v-for="item in differUnitOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { computed, watch, type PropType } from 'vue'
import ScenePropertyDatePicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyDatePicker/index.vue'
import Config, {
  INPUTS_DATE_DEFAULT_TYPE,
  INPUTS_DATE_DIFFER_UNIT,
  INPUTS_DATE_TYPE,
} from './config'

defineOptions({ name: 'VInputsDateConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

/**
 * 这里显式把展示方式固定为下拉：
 * 1. 用户已经确认不再需要“面板展示”；
 * 2. 旧场景若带着 isPanel=1 进来，也在打开配置面板时立即归一化为 0；
 * 3. 这样可以避免旧数据残留导致运行态和配置面板语义不一致。
 */
props.option.isPanel = 0

const differUnitOptions = [
  { label: '天', value: INPUTS_DATE_DIFFER_UNIT.DAY },
  { label: '周', value: INPUTS_DATE_DIFFER_UNIT.WEEK },
  { label: '月', value: INPUTS_DATE_DIFFER_UNIT.MONTH },
  { label: '季度', value: INPUTS_DATE_DIFFER_UNIT.QUARTER },
  { label: '年', value: INPUTS_DATE_DIFFER_UNIT.YEAR },
  { label: '小时', value: INPUTS_DATE_DIFFER_UNIT.HOUR },
  { label: '分钟', value: INPUTS_DATE_DIFFER_UNIT.MINUTE },
  { label: '秒', value: INPUTS_DATE_DIFFER_UNIT.SECOND },
  { label: '毫秒', value: INPUTS_DATE_DIFFER_UNIT.MILLISECOND },
]

const isRange = computed(() => String(props.option.type).endsWith('range'))

const actualPickerType = computed(() => {
  /**
   * 组件类型里保留“季度/季度范围”主要用于兼容旧场景数据；
   * 当前配置面板已不再提供“季度相关类型”的可选项。
   *
   * 由于组件库（Element Plus）不支持季度类型（quarter / quarterrange），
   * 如果旧数据里仍出现该类型，这里按“月份 / 月份范围”降级映射，
   * 让默认值与动态偏移仍可配置、可预览。
   */
  if (props.option.type === INPUTS_DATE_TYPE.QUARTER) return INPUTS_DATE_TYPE.MONTH
  if (props.option.type === INPUTS_DATE_TYPE.QUARTERRANGE) return INPUTS_DATE_TYPE.MONTHRANGE
  return props.option.type
})

const createDefaultValue = (): number | [number, number] => {
  const now = Date.now()
  return isRange.value ? ([now, now] as [number, number]) : now
}

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
  if (isRange.value) {
    return [
      addDateOffset(now, Number(props.option.differValue[0]) || 0, props.option.differUnit[0]),
      addDateOffset(now, Number(props.option.differValue[1]) || 0, props.option.differUnit[1]),
    ] as [number, number]
  }
  return addDateOffset(now, Number(props.option.differValue[0]) || 0, props.option.differUnit[0])
}

const resetValueByType = () => {
  /**
   * 切换类型时，旧项目会重置当前默认值。
   * 当前项目保持同一规则，避免单值 / 区间值在类型切换后结构错乱。
   */
  if (props.option.defaultType === INPUTS_DATE_DEFAULT_TYPE.NONE) {
    props.option.value = null
    return
  }
  props.option.value =
    props.option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC
      ? buildDynamicValue()
      : createDefaultValue()
}

const handleDefaultTypeChange = () => {
  if (props.option.defaultType === INPUTS_DATE_DEFAULT_TYPE.NONE) {
    props.option.value = null
    return
  }
  props.option.value =
    props.option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC
      ? buildDynamicValue()
      : createDefaultValue()
}

watch(
  () => [
    props.option.differValue[0],
    props.option.differValue[1],
    props.option.differUnit[0],
    props.option.differUnit[1],
    props.option.type,
    props.option.defaultType,
  ],
  () => {
    if (props.option.defaultType === INPUTS_DATE_DEFAULT_TYPE.DYNAMIC) {
      props.option.value = buildDynamicValue()
    }
  },
)
</script>
