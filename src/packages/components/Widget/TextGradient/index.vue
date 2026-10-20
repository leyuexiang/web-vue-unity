<template>
  <div class="widget-text-gradient" :style="rootStyle">
    {{ option.value }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Config from './config'

defineOptions({ name: 'VTextGradient' })

const props = defineProps<{ option: Config['option'] }>()

const rootStyle = computed(() => ({
  fontSize: `${props.option.fontSize}px`,
  fontWeight: props.option.fontWeight,
  /**
   * 旧项目里渐变文字支持配置渐变角度。
   * 当前项目这里继续沿用同一语义，保证基础面板改角度时画面能立即生效。
   */
  backgroundImage: `linear-gradient(${Number(props.option.deg) || 0}deg, ${
      props.option.fromColor}, ${props.option.toColor})`,
}))
</script>

<style scoped lang="scss">
.widget-text-gradient {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: var(--widget-font-family, inherit);
  color: transparent;
  text-align: center;
  user-select: none;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
