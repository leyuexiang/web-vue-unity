<template>
  <CommonChart :option="chartOption" />
</template>

<script setup lang="ts">
defineOptions({ name: 'VBasicTreemap' })

const props = defineProps({
  option: {
    type: Object,
    default: () => ({}),
  },
})

// 仅透传最终配置，图表实例、尺寸监听和销毁统一交给 CommonChart，避免重复创建监听器。
const chartOption = computed(() => props.option?.chartOption ?? {})
</script>
