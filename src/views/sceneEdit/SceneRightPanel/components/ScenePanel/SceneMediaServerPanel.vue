<template>
  <!-- 流媒体服务器接口暂未启用，保留组件文件以便后续恢复，不挂载选择器。 -->
  <section v-if="false" class="scene-media-server-panel" aria-hidden="true"></section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.scene-media-server-panel {
  display: grid;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--scene-edit-line);
}
p {
  margin: 0;
  font-weight: 600;
}
small {
  line-height: 1.6;
  color: var(--scene-edit-text-2);
}
</style>
