<template>
  <div>
    <setting-item-box name="强调色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.accentColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
    <setting-item-box name="延伸线颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.lineColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VDecorateTitleDividerConfigPanel' })
defineProps<{ option: Config['option'] }>()
</script>
