<template>
  <div>
    <setting-item-box name="资源来源" :alone="true">
      <!-- 窄属性栏使用下拉选择承载互斥来源，切换时仍会清理旧值以避免保存语义混淆。 -->
      <ScenePropertySelect v-model="resourceSource" aria-label="图片资源来源">
        <el-option label="外部资源" value="external" />
        <el-option label="资源市场" value="resource-market" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="图片资源" :alone="true">
      <!-- 外部资源延续原有在线链接加载方式，地址作为组件基础数据直接保存。 -->
      <ScenePropertyInput
        v-if="resourceSource === 'external'"
        v-model="option.value"
        placeholder="请输入在线图片链接"
      />
      <!-- 资源市场直接复用三维看板选择器，选择后同时获得运行时地址和稳定资源编号。 -->
      <ScenePropertyImageResourcePicker
        v-else
        v-model="option.value"
        v-model:resource-key="option.resourceKey"
      />
    </setting-item-box>

    <setting-item-box name="适应方式" :alone="true">
      <ScenePropertySelect v-model="option.fit" size="small">
        <el-option label="包含" value="contain" />
        <el-option label="覆盖" value="cover" />
        <el-option label="拉伸" value="fill" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="边缘形状" :alone="true">
      <!-- 形状选项统一来自图片组件模型，避免面板标签和值与渲染层出现漂移。 -->
      <ScenePropertySelect v-model="imageShape" size="small" aria-label="图片边缘形状">
        <el-option
          v-for="shape in IMAGE_SHAPE_OPTIONS"
          :key="shape.value"
          :label="shape.label"
          :value="shape.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <!-- 圆角仅对矩形生效；保留该字段可兼容历史配置和矩形细节调整。 -->
      <ScenePropertyNumberInput
        v-model="option.borderRadius"
        :disabled="!isRectangle"
        :min="0"
        size="small"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import ScenePropertyImageResourcePicker from '@/components/ScenePropertyImageResourcePicker/index.vue'
import ScenePropertyInput from '@/components/ScenePropertyInput/index.vue'
import ScenePropertySelect from '@/components/ScenePropertySelect/index.vue'
import Config, { type ImageResourceSource } from './config'
import { IMAGE_SHAPE_OPTIONS, normalizeImageShape, type ImageShape } from './shape'

defineOptions({ name: 'VImageConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

/** 历史场景缺少 shape 时仍回显矩形，并在用户选择后写回标准枚举值。 */
const imageShape = computed<ImageShape>({
  get: () => normalizeImageShape(props.option.shape),
  set: (value) => {
    props.option.shape = value
  },
})
const isRectangle = computed(() => imageShape.value === 'rectangle')

/**
 * 历史图片没有来源字段时按外部资源回显，保持旧场景在线地址可继续使用。
 * 来源真正变化时同时清空地址和编号，避免跨来源残留造成保存协议歧义。
 */
const resourceSource = computed<ImageResourceSource>({
  get: () => (props.option.sourceType === 'resource-market' ? 'resource-market' : 'external'),
  set: (value) => {
    if (value === resourceSource.value) return
    props.option.sourceType = value
    props.option.value = ''
    props.option.resourceKey = undefined
  },
})
</script>
