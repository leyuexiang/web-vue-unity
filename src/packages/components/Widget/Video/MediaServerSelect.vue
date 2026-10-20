<template>
  <div>
    <ScenePropertySelect :model-value="modelValue || ''" size="small" data-testid="video-media-server"
      @update:model-value="updateValue">
      <el-option :label="defaultLabel" value="" />
      <el-option v-for="server in servers" :key="server.id" :value="server.id"
        :label="`${server.name}（${server.address}）`" />
      <el-option v-if="modelValue && !servers.some(server => server.id === modelValue)"
        :value="modelValue" :label="`未找到服务器：${modelValue}`" />
    </ScenePropertySelect>
    <p v-if="error" class="media-server-hint">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { loadMediaServers, type PublicMediaServer } from './mediaClient'

withDefaults(defineProps<{ modelValue?: string; defaultLabel?: string }>(), {
  modelValue: '', defaultLabel: '使用场景默认服务器',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const servers = ref<PublicMediaServer[]>([])
const error = ref('')
let disposed = false
const updateValue = (value: unknown) => emit('update:modelValue', typeof value === 'string' ? value : '')
// 共享列表请求无需因单个面板销毁而取消，但不能把迟到结果写入已卸载组件。
onMounted(async () => {
  try {
    const result = await loadMediaServers()
    if (disposed) return
    servers.value = result.servers
    if (!result.servers.length) error.value = '尚未配置流媒体服务器，请联系管理员'
  } catch (cause) {
    if (!disposed) error.value = cause instanceof Error ? cause.message : '无法加载媒体服务器'
  }
})
onBeforeUnmount(() => { disposed = true })
</script>

<style scoped>
.media-server-hint {
  margin: 4px 0;
  font-size: 12px;
  color: var(--scene-edit-text-2);
}
</style>
