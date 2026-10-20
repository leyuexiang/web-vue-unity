<template>
  <div class="widget-icon" :style="containerStyle">
    <component
      :is="iconComponent"
      class="widget-icon__svg"
      :style="iconStyle"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'
import { normalizeGoviewIconName, resolveGoviewIconComponent } from './iconCatalog'

defineOptions({ name: 'VIcon' })

const props = defineProps<{
  option: Config['option']
  widgetId?: string
}>()

const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

const toSafeSize = (value: unknown) => {
  const parsedSize = Number(value)
  if (!Number.isFinite(parsedSize)) return 64
  return Math.min(Math.max(parsedSize, 1), 512)
}

const toRotateDegree = (value: unknown) => {
  const parsedRotate = Number(value)
  if (!Number.isFinite(parsedRotate)) return 0
  return Math.min(Math.max(parsedRotate, 0), 3) * 90
}

const iconName = computed(() => normalizeGoviewIconName(props.option.value || props.option.dataset))
const iconComponent = computed(() => resolveGoviewIconComponent(iconName.value))

const containerStyle = computed(() => ({
  color: props.option.color || '#9ca3af',
}))

const iconStyle = computed(() => {
  const safeSize = toSafeSize(props.option.size)

  return {
    width: `${safeSize}px`,
    height: `${safeSize}px`,
    transform: `rotate(${toRotateDegree(props.option.rotate)}deg)`,
  }
})

watch(
  iconName,
  (nextIconName) => {
    /**
     * 图标运行态值统一登记到 `value` 字段。
     * 状态/交互规则读取当前组件数据时就能直接拿到最新图标名，
     * 且不需要理解图标部件内部仍保留 GoView 的 dataset 字段。
     * 写入入口通过上下文注入，后续可直接接入统一二维运行时。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', nextIconName)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
.widget-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}
.widget-icon__svg {
  display: block;
  flex: 0 0 auto;
  color: currentcolor;
  transition:
    color 120ms ease-out,
    transform 120ms ease-out;
}
</style>
