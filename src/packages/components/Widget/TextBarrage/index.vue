<template>
  <div class="widget-text-barrage">
    <div class="widget-text-barrage__track" :style="trackStyle">
      <span class="widget-text-barrage__item">{{ option.value }}</span>
      <span class="widget-text-barrage__item" aria-hidden="true">{{ option.value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Config from './config'

defineOptions({ name: 'VTextBarrage' })

const props = defineProps<{ option: Config['option'] }>()

const trackStyle = computed(() => ({
  color: props.option.fontColor,
  fontSize: `${props.option.fontSize}px`,
  fontWeight: props.option.fontWeight,
  letterSpacing: `${props.option.letterSpacing}px`,
  animationDuration: `${Math.max(Number(props.option.duration) || 12, 1)}s`,
  /**
   * 这里把旧项目里的阴影参数完整接回来：
   * - 水平偏移
   * - 垂直偏移
   * - 模糊半径
   * - 阴影颜色
   *
   * 这样基础面板补齐后，每一项都能在当前项目里实际生效。
   */
  textShadow: props.option.showShadow
    ? `${Number(props.option.hShadow) || 0}px ${Number(props.option.vShadow) || 0}px ${
      Number(props.option.blurShadow) || 0}px ${props.option.shadowColor}`
    : 'none',
}))
</script>

<style scoped lang="scss">
.widget-text-barrage {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}
.widget-text-barrage__track {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  display: inline-flex;
  flex: 0 0 auto;
  min-width: max-content;
  font-family: var(--widget-font-family, inherit);
  white-space: nowrap;
  animation-name: widget-text-barrage-move;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.widget-text-barrage__item + .widget-text-barrage__item {
  margin-left: 64px;
}

@keyframes widget-text-barrage-move {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
