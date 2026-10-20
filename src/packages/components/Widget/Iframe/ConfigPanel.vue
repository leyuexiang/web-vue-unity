<template>
  <div>
    <setting-item-box name="地址" :alone="true">
      <ScenePropertyInput v-model="option.value" />
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <ScenePropertyNumberInput v-model="option.borderRadius" :min="0" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VIframeConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
