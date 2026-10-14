<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SceneObject, SceneTransform } from '@/scene-core'

const props = defineProps<{ object: SceneObject | null }>()
const emit = defineEmits<{
  transform: [before: SceneTransform, after: SceneTransform]
  visibility: [visible: boolean]
}>()

const draftPosition = ref<[number, number, number]>([0, 0, 0])

watch(
  () => props.object,
  (object) => {
    draftPosition.value = object ? [...object.transform.position] : [0, 0, 0]
  },
  { immediate: true },
)

const title = computed(() => props.object?.name ?? '场景属性')

const commitPosition = () => {
  if (!props.object) return
  const before = props.object.transform
  const after: SceneTransform = {
    ...before,
    position: [...draftPosition.value],
    rotation: { ...before.rotation, value: [...before.rotation.value] },
    scale: [...before.scale],
  }
  if (JSON.stringify(before.position) !== JSON.stringify(after.position)) emit('transform', before, after)
}
</script>

<template>
  <aside class="inspector-panel panel">
    <header class="panel__header">
      <div>
        <span class="panel__eyebrow">INSPECTOR</span>
        <h2>{{ title }}</h2>
      </div>
    </header>

    <div v-if="object" class="inspector-content">
      <section class="property-section">
        <h3>基础</h3>
        <label class="property-row">
          <span>实例编号</span>
          <input :value="object.instanceId" disabled />
        </label>
        <label class="property-row property-row--inline">
          <span>显示</span>
          <input
            type="checkbox"
            :checked="object.visible"
            @change="emit('visibility', ($event.target as HTMLInputElement).checked)"
          />
        </label>
      </section>

      <section class="property-section">
        <h3>位置</h3>
        <div class="vector-grid">
          <label v-for="(_, index) in draftPosition" :key="index">
            <span>{{ ['X', 'Y', 'Z'][index] }}</span>
            <input v-model.number="draftPosition[index]" type="number" step="0.1" @change="commitPosition" />
          </label>
        </div>
      </section>

      <section class="property-section property-section--muted">
        <h3>Unity Runtime</h3>
        <p>旋转、缩放、材质和动画将在对应协议能力启用后开放。</p>
      </section>
    </div>

    <div v-else class="empty-state">
      <span>选择一个对象后编辑属性</span>
    </div>
  </aside>
</template>
