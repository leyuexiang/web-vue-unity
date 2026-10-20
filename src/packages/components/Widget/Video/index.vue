<template>
  <!--
    视频部件只开放场景配置中的标准播放能力，不允许浏览器额外注入画中画、投屏或翻译入口。
    限制直接声明在原生 video 元素上，可同时覆盖编辑器预览和正式发布页面；它们不会改变
    自动播放、循环、静音、原生控制条及行内播放行为，也不需要区分 GIS 和非 GIS 场景。
  -->
  <div class="widget-video-shell" :style="{ fontFamily: option.statusFontFamily || undefined }">
    <video
      ref="videoRef"
      class="widget-video notranslate"
      :autoplay="option.autoplay"
      :loop="!option.isLive && option.loop"
      :muted="option.muted"
      :controls="option.controls"
      :poster="option.poster"
      controlslist="nodownload noremoteplayback"
      disablepictureinpicture
      disableremoteplayback
      translate="no"
      :style="videoStyle"
      playsinline
      @canplay="handleCanPlay"
      @playing="handlePlaying"
      @error="handleNativeError"
    />

    <div v-if="!hasPlaybackUrl" class="widget-video-status">请配置视频地址</div>
    <div v-else-if="errorMessage" class="widget-video-status widget-video-status--error">
      <span>{{ errorMessage }}</span>
      <!-- 按钮独立应用字体，不让提示文字的设置覆盖按钮配置。 -->
      <button
        v-if="needsManualPlay"
        type="button"
        :style="{ fontFamily: option.buttonFontFamily || undefined }"
        @click.stop="playManually"
      >
        播放
      </button>
      <button
        v-else
        type="button"
        :style="{ fontFamily: option.buttonFontFamily || undefined }"
        @click.stop="restartPlayer"
      >
        重新连接
      </button>
    </div>
    <div v-else-if="loading" class="widget-video-status">正在连接视频流…</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import Config from './config'
import { useVideoStream } from './useVideoStream'

defineOptions({ name: 'VVideo' })

const props = defineProps<{ option: Config['option'] }>()
const videoRef = ref<HTMLVideoElement | null>(null)
const {
  loading,
  errorMessage,
  needsManualPlay,
  hasPlaybackUrl,
  handleCanPlay,
  handlePlaying,
  handleNativeError,
  restartPlayer,
  playManually,
} = useVideoStream(videoRef, () => props.option)

/**
 * 旧项目里的视频组件支持“适应方式 + 圆角”。
 * 当前项目保持同一套配置含义，避免基础面板和旧项目出现明显断层。
 */
const videoStyle = computed<CSSProperties>(() => ({
  objectFit: props.option.fit,
  borderRadius: `${Number(props.option.borderRadius) || 0}px`,
}))
</script>

<style scoped lang="scss">
.widget-video-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #08111f;
}
.widget-video {
  display: block;
  width: 100%;
  height: 100%;
  background: #08111f;
}
.widget-video-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: rgb(216 231 255 / 72%);
  text-align: center;
  background: rgb(8 17 31 / 88%);
  &--error {
    color: #ffb7b7;
  }
  button {
    padding: 5px 12px;
    color: #d8e7ff;
    cursor: pointer;
    background: rgb(45 91 142 / 72%);
    border: 1px solid rgb(100 163 229 / 55%);
    border-radius: 4px;
  }
}
</style>
