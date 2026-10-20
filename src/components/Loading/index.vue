<template>
  <div id="loading-component" v-show="loading">
    <div class="loading-box">
      <div class="loading">
        <div class="h-[40px]">
          <div v-loading="loading"></div>
        </div>
        <div class="progress-txt" v-if="percentage > 0">
          已加载 <b>{{ percentage }}</b> %
          <div class="progress-bar">
            <div class="progress" :style="{ width: `${percentage}%` }"></div>
          </div>
        </div>
        <div class="loading-txt">{{ loadingText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { percentage, loading, loadingText } = defineProps({
  percentage: {
    type: [Number],
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingText: {
    type: String,
    default: '首次加载需要较长时间，请耐心等待...',
  },
})
</script>

<style scoped lang="scss" src="./index.scss"></style>
