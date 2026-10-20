<template>
  <CommonChart :option="chartOption" />
</template>

<script setup lang="ts">
defineOptions({ name: 'VGaugeCyan' })

const props = defineProps({
  option: {
    type: Object,
    default: () => ({}),
  },
})

const chartOption = computed(() => props.option?.chartOption ?? {})
</script>
