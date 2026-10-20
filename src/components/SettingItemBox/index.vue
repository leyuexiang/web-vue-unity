<template>
  <div class="config-item-box">
    <el-text class="item-left" :title="name">
      {{ name }}
      <el-space :size="5">
        <slot name="name"></slot>
      </el-space>
    </el-text>
    <div
      class="item-right"
      :style="{
        gridTemplateColumns: alone ? '1fr' : '1fr 1fr',
        ...itemRightStyle,
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: { type: String, required: false },
  alone: { type: Boolean, default: false, required: false },
  itemRightStyle: { type: Object, default: () => {}, required: false },
})
</script>
<style lang="scss" scoped>
$left-width: 92px;
.config-item-box {
  position: relative;
  display: flex;
  margin: 20px 0;
  .item-left {
    /**
     * 右侧基础面板现在有不少中文长标题，例如“轮播间隔(ms)”。
     * 旧的 60px 宽度会强制折行，导致布局参差不齐。
     * 这里统一加宽并改成单行省略，既避免换行，也保留 title 供悬浮查看完整文本。
     */
    align-self: auto;
    width: $left-width;
    margin-top: 6px;
    margin-left: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    text-align: left;
    white-space: nowrap;
  }
  .item-right {
    display: grid;
    grid-column-gap: 10px;
    width: calc(100% - #{$left-width});
  }
}
</style>
