<template>
  <div class="setting-item" :style="{ width: width + 'px' }">
    <slot></slot>
    <el-text class="name">{{ name }}</el-text>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: { type: String, required: false },
  width: { type: Number, required: false },
})
</script>

<style lang="scss" scoped>
.setting-item {
  display: flex;
  flex-direction: column;
  min-width: 110px;
  margin-bottom: 5px;
  text-align: start;
  .name {
    margin-top: 2px;
    font-size: 12px;
    color: #a7aab1;
  }
}
</style>
