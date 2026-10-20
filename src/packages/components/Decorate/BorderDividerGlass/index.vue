<template>
  <div
    class="divider-glass-border"
    :style="{
      '--glass-color': option.glassColor ?? 'rgba(12, 49, 88, 0.72)',
      '--border-color': option.borderColor ?? 'rgba(205, 235, 255, 0.82)',
      '--line-color': option.lineColor ?? 'rgba(169, 205, 229, 0.32)',
      '--accent-color': option.accentColor ?? '#00C6FF',
    }"
  >
    <div class="glass-background" />

    <span class="edge edge-top" />
    <span class="edge edge-right" />
    <span class="edge edge-bottom" />
    <span class="edge edge-left" />

    <span class="corner corner-top-left" />
    <span class="corner corner-top-right" />
    <span class="corner corner-bottom-right" />
    <span class="corner corner-bottom-left" />

    <div class="divider-decoration" aria-hidden="true">
      <span class="divider-line" />
      <span class="divider-accent" />
      <span class="divider-slash divider-slash-first" />
      <span class="divider-slash divider-slash-second" />
      <span class="divider-slash divider-slash-third" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VBorderDividerGlass' })

defineProps<{ option: Config['option'] }>()
</script>

<style scoped>
/*
 * 用固定尺寸的角节点和四条独立边线代替整张图片等比拉伸。
 * 因此组件变宽或变高时，四角的形状和装饰长度都不会被压扁。
 */
.divider-glass-border {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
}
.glass-background {
  position: absolute;
  inset: 1px;
  z-index: -1;
  background: var(--glass-color);
  backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
.edge,
.corner {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  background: var(--border-color);
}
.edge-top,
.edge-bottom {
  right: 20px;
  left: 20px;
  height: 1px;
}
.edge-top {
  top: 0;
}
.edge-bottom {
  bottom: 0;
}
.edge-left,
.edge-right {
  top: 20px;
  bottom: 20px;
  width: 1px;
}
.edge-left {
  left: 0;
}
.edge-right {
  right: 0;
}
.corner {
  width: 20px;
  height: 20px;
  background: transparent;
  border-color: var(--border-color);
  border-style: solid;
}
.corner-top-left {
  top: 0;
  left: 0;
  border-width: 1px 0 0 1px;
}
.corner-top-right {
  top: 0;
  right: 0;
  border-width: 1px 1px 0 0;
}
.corner-bottom-right {
  right: 0;
  bottom: 0;
  border-width: 0 1px 1px 0;
}
.corner-bottom-left {
  bottom: 0;
  left: 0;
  border-width: 0 0 1px 1px;
}
.divider-decoration {
  position: absolute;

  /* 原图的顶部固定装饰带到分割线约 40px，不能用百分比随组件高度缩放。 */
  top: 40px;
  right: 16px;
  left: 16px;
  z-index: 2;
  height: 2px;
  pointer-events: none;
}
.divider-line,
.divider-accent,
.divider-slash {
  position: absolute;
  display: block;
}
.divider-line {
  top: 1px;
  right: 0;
  left: 0;
  height: 1px;
  background: var(--line-color);
}
.divider-accent {
  top: 0;
  left: 0;
  width: 20px;
  height: 2px;
  background: var(--accent-color);
  box-shadow: 0 0 5px color-mix(in srgb, var(--accent-color) 60%, transparent);
}
.divider-slash {
  top: 0;
  width: 4px;
  height: 2px;
  background: var(--accent-color);
  opacity: 0.82;
  transform: skewX(-35deg);
}
.divider-slash-first {
  right: 14px;
}
.divider-slash-second {
  right: 8px;
  opacity: 0.64;
}
.divider-slash-third {
  right: 2px;
  opacity: 0.44;
}
</style>
