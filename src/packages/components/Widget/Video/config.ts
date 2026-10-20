import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export type VideoFitMode = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
export type VideoSourceProtocol =
  | 'auto'
  | 'gb28181'
  | 'rtsp'
  | 'rtmp'
  | 'hls'
  | 'http-flv'
  | 'webrtc'
  | 'native'
/** 私有 RTSP 网关需显式选型，其信令及分片格式与 WHEP、WS-FLV 不兼容。 */
export type VideoPlaybackProtocol =
  | 'auto'
  | 'hls'
  | 'flv'
  | 'webrtc'
  | 'native'
  | 'rtsp-webrtc'
  | 'rtsp-mse'

export type VideoOption = {
  /** 空值使用场景默认服务器；只保存公开 ID，管理地址与密钥由服务端持有。 */
  mediaServerId?: string
  /** 状态提示和重连按钮独立选择字体；旧场景未配置时保持原有外观。 */
  statusFontFamily?: string
  buttonFontFamily?: string
  /** 上游摄像机或平台使用的协议，仅用于描述接入来源。 */
  sourceProtocol: VideoSourceProtocol
  /** 原始源流或通道标识；私有 RTSP 模式将它提交给网关，浏览器不直接连接摄像头。 */
  sourceUrl: string
  /** 视频源或播放地址；自动模式把 RTSP/RTMP 交给服务端接入，私有模式仍表示网关地址。 */
  value: string
  /** 网关输出格式；自动模式会根据播放地址和上游协议推断。 */
  playbackProtocol: VideoPlaybackProtocol
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  isLive: boolean
  lowLatency: boolean
  withCredentials: boolean
  reconnectAttempts: number
  reconnectInterval: number
  poster: string
  fit: VideoFitMode
  borderRadius: number
  label: string
}

export const VVideoInfo = {
  name: '视频',
  keyName: 'VVideo',
  packageName: 'Widget',
  icon: new URL(`../assets/images/video.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 200, zIndex: -1 }
  public info = clone(VVideoInfo)
  public option: VideoOption = {
    mediaServerId: '',
    sourceProtocol: 'auto',
    sourceUrl: '',
    value: '',
    playbackProtocol: 'auto',
    autoplay: true,
    loop: false,
    muted: true,
    controls: true,
    isLive: true,
    lowLatency: true,
    withCredentials: false,
    reconnectAttempts: 3,
    reconnectInterval: 3000,
    poster: '',
    fit: 'contain',
    borderRadius: 10,
    label: '安监视频',
  }
}
