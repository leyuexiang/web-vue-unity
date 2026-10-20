<template>
  <div class="widget-inputs-tab" :class="`widget-inputs-tab--${option.tabType || 'segment'}`">
    <button
      v-for="item in normalizedOptions"
      :key="item.value"
      type="button"
      class="widget-inputs-tab__item"
      :class="{ 'is-active': String(activeValue) === String(item.value) }"
      @click="handleSelect(item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'

defineOptions({ name: 'VInputsTab' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const normalizedOptions = computed(() =>
  Array.isArray(props.option.options) && props.option.options.length > 0
    ? props.option.options
    : [{ label: '选项1', value: '1' }],
)

/**
 * 标签选择器在预览态允许用户临时切换选中项，
 * 但不直接回写到场景配置，避免把预览点击当成编辑操作持久化。
 */
const activeValue = ref<string>('')

watch(
  () => props.option.value,
  (newValue) => {
    activeValue.value = String(newValue ?? '')
  },
  {
    immediate: true,
  },
)

const handleSelect = (value: string | number) => {
  /**
   * 这里只维护实例自己的预览态选中值。
   * 真正需要持久化的更新，仍然应由右侧配置面板或后续交互系统负责。
   */
  activeValue.value = String(value)
  widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', activeValue.value)
}

watch(
  activeValue,
  (newValue) => {
    /**
     * 标签选择器的当前选中项就是它的运行时判断值。
     * 这里保留一层 watch，是为了覆盖“外部配置值变化”和“内部点击切换”两条更新来源。
     * 写入入口通过上下文注入，避免组件包直接依赖编辑器仓库。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
.widget-inputs-tab {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  height: 100%;
}
.widget-inputs-tab__item {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  /**
   * 让每个选项卡在水平方向“等分并占满”容器：
   * - 弹性布局（flex）：让同级子项按比例分配剩余空间
   * - 伸缩属性（flex: 1 1 0）：每个按钮基础宽度为 0，剩余空间均分
   * - 最小宽度（min-width: 0）：允许在窄容器下继续收缩，避免被内容顶开导致无法等分
   */
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  padding: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--widget-font-family, inherit);
  color: #d8e7ff;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  background: rgb(48 67 108 / 65%);
  border: 1px solid rgb(74 158 248 / 35%);
  border-radius: 6px;
}
.widget-inputs-tab__item.is-active {
  color: #ffffff;
  background: linear-gradient(90deg, rgb(74 158 248 / 35%), rgb(90 227 255 / 35%));
  border-color: rgb(90 227 255 / 70%);
}
.widget-inputs-tab--line .widget-inputs-tab__item {
  background: transparent;
  border-color: transparent;
  border-width: 0 0 2px;
  border-radius: 0;
}
.widget-inputs-tab--line .widget-inputs-tab__item.is-active {
  background: transparent;
  border-color: rgb(90 227 255 / 85%);
}
</style>
