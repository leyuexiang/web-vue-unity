<script setup lang="ts">
import type { SceneObject } from '@/scene-core'

defineProps<{
  objects: SceneObject[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [instanceId: string | null]
}>()
</script>

<template>
  <aside class="hierarchy-panel panel">
    <header class="panel__header">
      <div>
        <span class="panel__eyebrow">SCENE</span>
        <h2>场景结构</h2>
      </div>
      <span class="panel__count">{{ objects.length }}</span>
    </header>

    <button
      class="hierarchy-item hierarchy-item--root"
      :class="{ 'is-selected': selectedId === null }"
      type="button"
      @click="emit('select', null)"
    >
      <span class="hierarchy-item__icon">◇</span>
      <span>场景根节点</span>
    </button>

    <div class="hierarchy-list">
      <button
        v-for="object in objects"
        :key="object.instanceId"
        class="hierarchy-item"
        :class="{ 'is-selected': object.instanceId === selectedId }"
        type="button"
        @click="emit('select', object.instanceId)"
      >
        <span class="hierarchy-item__icon">{{ object.objectType === 'model' ? '⬡' : '◈' }}</span>
        <span class="hierarchy-item__name">{{ object.name }}</span>
        <span v-if="object.locked" class="hierarchy-item__badge">锁</span>
      </button>
    </div>
  </aside>
</template>
