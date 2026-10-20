<template>
  <div>
    <setting-item-box name="图片路径" :alone="true">
      <!-- 上传预览、地址输入和删除动作统一交给共享缩略图列表，业务层只同步最终地址数组。 -->
      <ScenePropertyThumbnailList v-model="imageListModel" />
    </setting-item-box>

    <setting-item-box name="自动播放" :alone="true">
      <ScenePropertySwitch v-model="option.autoplay" />
    </setting-item-box>

    <setting-item-box name="轮播间隔(ms)" :alone="true">
      <ScenePropertyNumberInput v-model="option.interval" :min="1000" size="small" />
    </setting-item-box>

    <setting-item-box name="轮播方向" :alone="true">
      <ScenePropertySelect v-model="option.direction" size="small">
        <el-option label="水平" value="horizontal" />
        <el-option label="垂直" value="vertical" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="过渡效果" :alone="true">
      <ScenePropertySelect v-model="option.effect" size="small">
        <el-option label="滑动" value="slide" />
        <el-option label="淡入淡出" value="fade" />
        <el-option label="卡片" value="card" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="显示圆点" :alone="true">
      <ScenePropertySwitch v-model="option.showDots" />
    </setting-item-box>

    <setting-item-box name="指示器样式" :alone="true">
      <ScenePropertySelect v-model="option.dotType" size="small">
        <el-option label="点" value="dot" />
        <el-option label="线" value="line" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="指示器位置" :alone="true">
      <ScenePropertySelect v-model="option.dotPlacement" size="small">
        <el-option label="下边" value="bottom" />
        <el-option label="上边" value="top" />
        <el-option label="左边" value="left" />
        <el-option label="右边" value="right" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="显示箭头" :alone="true">
      <ScenePropertySwitch v-model="option.showArrow" />
    </setting-item-box>

    <setting-item-box name="适应方式" :alone="true">
      <ScenePropertySelect v-model="option.fit" size="small">
        <el-option label="包含" value="contain" />
        <el-option label="覆盖" value="cover" />
        <el-option label="拉伸" value="fill" />
        <el-option label="缩小适应" value="scale-down" />
        <el-option label="原始尺寸" value="none" />
      </ScenePropertySelect>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VImageCarouselConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

/**
 * 旧项目是“逐项路径编辑”，这比直接改 JSON 更适合人工配置。
 * 这里使用本地字符串数组承接输入，再统一同步回 dataset / options：
 * 1. dataset 负责基础面板的直观配置；
 * 2. options 负责兼容当前项目已有的数据映射链路；
 * 3. 两者始终保持同源，避免渲染和映射各读一套数据。
 */
const imageList = ref<string[]>([])

watch(
  () => ({
    dataset: props.option.dataset,
    options: props.option.options,
  }),
  (newValue) => {
    const dataset = Array.isArray(newValue.dataset)
      ? newValue.dataset.map((item) => String(item ?? ''))
      : []
    const options = Array.isArray(newValue.options)
      ? newValue.options.map((item) => String(item?.value ?? ''))
      : []

    /**
     * 面板回显要同时兼顾两种场景：
     * 1. 手工配置时，dataset 和 options 是同源的，此时必须保留空字符串行，
     *    否则点击“新增图片”后新行会被立刻过滤掉；
     * 2. 数据映射时，右侧数据面板可能只更新 options，且内容会与 dataset 不一致，
     *    这时要优先回显真正参与运行时渲染的 options。
     */
    const datasetText = JSON.stringify(dataset)
    const optionsText = JSON.stringify(options)
    imageList.value = optionsText !== datasetText && options.length > 0 ? options : dataset
  },
  {
    immediate: true,
    deep: true,
  },
)

const syncImageList = () => {
  /**
   * 这里不能过滤空字符串：
   * - 空字符串代表“新增但尚未填写”的占位输入行；
   * - 只有用户主动删除时，才应该移除这一项。
   */
  const normalizedList = imageList.value.map((item) => String(item ?? '').trim())
  props.option.dataset = normalizedList
  props.option.options = normalizedList.map((item, index) => ({
    label: `图片${index + 1}`,
    value: item,
  }))
}

/**
 * 共享缩略图列表以不可变数组发出变更；计算模型在这里接回原有 dataset/options 双写逻辑，
 * 保证上传、粘贴地址、删除和新增都继续驱动既有轮播渲染与数据映射。
 */
const imageListModel = computed<string[]>({
  get: () => imageList.value,
  set: (nextValue) => {
    imageList.value = nextValue
    syncImageList()
  },
})
</script>
