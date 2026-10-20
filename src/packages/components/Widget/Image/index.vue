<template>
  <el-image class="widget-image" :src="imageSource" :fit="option.fit" :style="imageStyle" />
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import Config from './config'
import { getImageShapeStyle } from './shape'
import { useImageSource } from './useImageSource'

defineOptions({ name: 'VImage' })

const props = defineProps<{ option: Config['option'] }>()

/** 市场数据映射消费稳定编号；呈现地址独立解析，编辑和预览共用同一条链路。 */
const imageSource = useImageSource(() => props.option)

/**
 * 形状样式只依赖当前组件配置，保持为计算值可避免渲染过程中重复创建裁剪路径。
 * 历史场景没有 `shape` 字段时由工具函数自动回退到矩形。
 */
const imageStyle = computed<CSSProperties>(() =>
  getImageShapeStyle(props.option.shape, props.option.borderRadius),
)
</script>

<style scoped>
.widget-image {
  display: block;
  width: 100%;
  height: 100%;

  /* Block layout keeps the image inside its widget bounds, including small icons. */

  /* 矩形圆角需要裁剪 el-image 内部 img；非矩形由 clip-path 统一裁剪。 */
  overflow: hidden;
}
</style>
