<template>
  <div>
    <!-- 仅配置组件自己的提示文字，不影响浏览器原生视频控制条。 -->
    <setting-item-box name="提示文字字体" :alone="true">
      <ScenePropertySelect v-model="option.statusFontFamily" placeholder="默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="重连按钮字体" :alone="true">
      <ScenePropertySelect v-model="option.buttonFontFamily" placeholder="默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box v-if="privateRtsp" name="上游协议" :alone="true">
      <ScenePropertySelect v-model="option.sourceProtocol" size="small">
        <el-option label="自动识别" value="auto" />
        <el-option label="GB28181" value="gb28181" />
        <el-option label="RTSP" value="rtsp" />
        <el-option label="RTMP" value="rtmp" />
        <el-option label="HLS" value="hls" />
        <el-option label="HTTP-FLV" value="http-flv" />
        <el-option label="WebRTC" value="webrtc" />
        <el-option label="普通视频" value="native" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box
      v-if="privateRtsp"
      name="RTSP 源地址"
      :alone="true"
    >
      <ScenePropertyInput
        v-model="option.sourceUrl"
        placeholder="rtsp://摄像头地址/通道"
      />
    </setting-item-box>

    <setting-item-box name="播放方式" :alone="true">
      <ScenePropertySelect v-model="option.playbackProtocol" size="small" data-testid="video-playback-protocol">
        <el-option label="自动识别" value="auto" />
        <el-option label="HLS (.m3u8)" value="hls" />
        <el-option label="HTTP/WS-FLV" value="flv" />
        <el-option label="WebRTC (WHEP)" value="webrtc" />
        <el-option label="RTSP-WebRTC（私有接口）" value="rtsp-webrtc" />
        <el-option label="RTSP-MSE（WebSocket）" value="rtsp-mse" />
        <el-option label="浏览器原生" value="native" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box :name="privateRtsp ? '网关地址（可选）' : '视频地址'" :alone="true">
      <ScenePropertyInput v-model="videoAddress" :placeholder="gatewayPlaceholder" />
    </setting-item-box>

    <!--
      流媒体服务器接口（/api/media/servers）暂未接入当前环境，先隐藏服务器选择器。
      保留视频地址和已有播放协议配置，避免编辑器继续触发媒体服务器列表请求。
    -->

    <p class="video-config-hint">{{ protocolHint }}</p>

    <setting-item-box name="封面地址" :alone="true">
      <ScenePropertyInput v-model="option.poster" placeholder="可选，视频加载前显示" />
    </setting-item-box>

    <setting-item-box name="自动播放" :alone="true">
      <ScenePropertySwitch v-model="option.autoplay" />
    </setting-item-box>

    <setting-item-box name="循环播放" :alone="true">
      <ScenePropertySwitch v-model="option.loop" />
    </setting-item-box>

    <setting-item-box name="实时流" :alone="true">
      <ScenePropertySwitch v-model="option.isLive" />
    </setting-item-box>

    <setting-item-box name="低延迟模式" :alone="true">
      <ScenePropertySwitch v-model="option.lowLatency" />
    </setting-item-box>

    <!-- 浏览器 WebSocket 不支持该请求选项，避免展示不起作用的开关。 -->
    <setting-item-box
      v-if="option.playbackProtocol !== 'rtsp-mse'"
      name="携带跨域凭据"
      :alone="true"
    >
      <ScenePropertySwitch v-model="option.withCredentials" />
    </setting-item-box>

    <setting-item-box name="断线重试次数" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.reconnectAttempts"
        :min="0"
        :max="20"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="重试间隔(ms)" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.reconnectInterval"
        :min="500"
        :max="60000"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="静音" :alone="true">
      <ScenePropertySwitch v-model="option.muted" />
    </setting-item-box>

    <setting-item-box name="显示控制条" :alone="true">
      <ScenePropertySwitch v-model="option.controls" />
    </setting-item-box>

    <setting-item-box name="适应方式" :alone="true">
      <ScenePropertySelect v-model="option.fit" size="small">
        <el-option label="包含" value="contain" />
        <el-option label="覆盖" value="cover" />
        <el-option label="拉伸" value="fill" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <ScenePropertyNumberInput v-model="option.borderRadius" :min="0" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import { computed, type PropType } from 'vue'
import Config from './config'
import { getVideoProtocolHint, isPrivateRtspProtocol } from './streamModel'
import { getManagedVideoSource } from './mediaClient'

defineOptions({ name: 'VVideoConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})

// 标准模式统一输入视频地址，旧场景仅有 sourceUrl 时仍回显；编辑后转存 value，避免清空后恢复旧源。
const privateRtsp = computed(() => isPrivateRtspProtocol(props.option.playbackProtocol))
const managedSource = computed(() => getManagedVideoSource(props.option))
const videoAddress = computed({
  get: () => privateRtsp.value ? props.option.value : props.option.value || props.option.sourceUrl || '',
  set: (value: string) => {
    props.option.value = value
    if (!privateRtsp.value) props.option.sourceUrl = ''
  },
})
const gatewayPlaceholder = computed(() => {
  if (props.option.playbackProtocol === 'rtsp-webrtc') return '默认 /api/rtsp/webrtc'
  if (props.option.playbackProtocol === 'rtsp-mse') return '默认 /ws/rtsp/mse'
  return 'RTSP / RTMP 源地址或浏览器播放地址'
})
const protocolHint = computed(() =>
  privateRtsp.value ? getVideoProtocolHint(props.option.sourceProtocol, props.option.playbackProtocol)
    : managedSource.value
      ? '由流媒体服务器自动接入源流；自动播放方式优先使用低延迟 WebRTC。'
      : '自动识别视频地址；RTSP / RTMP 自动接入流媒体服务器，HLS / FLV / 普通视频直接播放。',
)
</script>

<style scoped>
.video-config-hint {
  margin: 2px 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: rgb(216 231 255 / 52%);
}
</style>
