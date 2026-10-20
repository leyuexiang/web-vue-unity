<template>
  <div>
    <!-- 字体候选项与页面分页器共用；未配置时保留原有继承字体。 -->
    <setting-item-box name="文字字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" size="small" placeholder="默认字体">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="标签" :alone="true">
      <setting-item>
        <ScenePropertyInput v-model="option.label" placeholder="请输入名称" />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="值" :alone="true">
      <setting-item>
        <ScenePropertyInput v-model="option.value" placeholder="请输入值" />
      </setting-item>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import config from './config.ts'

defineOptions({ name: 'VInputConfigPanel' })

defineProps({
  option: { type: Object as PropType<typeof config.prototype.option>, required: true },
})
</script>

<style scoped></style>
